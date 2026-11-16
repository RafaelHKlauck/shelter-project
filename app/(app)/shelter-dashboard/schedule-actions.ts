"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { friendlyError } from "@/lib/volunteering/errors";
import { attendanceSchema, shiftFormSchema, type ShiftFormInput } from "@/lib/volunteering/schemas";
import { localToUtcIso, utcToLocalParts } from "@/lib/volunteering/time";

type Result = { error?: string };

function revalidate() {
  revalidatePath("/shelter-dashboard");
  revalidatePath("/volunteering");
}

const uuid = z.string().uuid();

// UC01/UC02 — RF27, RF29
export async function createShiftAction(
  shelterId: string,
  input: ShiftFormInput,
): Promise<Result & { created?: number }> {
  const parsed = shiftFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  if (!uuid.safeParse(shelterId).success) return { error: "Abrigo inválido." };
  await requireUser();
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_shift", {
    p_shelter_id: shelterId,
    p_title: v.title,
    p_task_type: v.task_type,
    p_description: v.description ?? "",
    p_starts_at: localToUtcIso(v.date, v.start_time),
    p_ends_at: localToUtcIso(v.date, v.end_time),
    p_capacity: v.capacity,
    p_repeat_weeks: v.repeat_weekly ? v.repeat_weeks : 1,
  });
  if (error) return { error: friendlyError(error) };
  revalidate();
  return { created: Array.isArray(data) ? data.length : 1 };
}

// RF28 / RN14
export async function updateShiftAction(shiftId: string, input: ShiftFormInput): Promise<Result | void> {
  const parsed = shiftFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  if (!uuid.safeParse(shiftId).success) return { error: "Turno inválido." };
  await requireUser();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_shift", {
    p_shift_id: shiftId,
    p_title: v.title,
    p_task_type: v.task_type,
    p_description: v.description ?? "",
    p_starts_at: localToUtcIso(v.date, v.start_time),
    p_ends_at: localToUtcIso(v.date, v.end_time),
    p_capacity: v.capacity,
  });
  if (error) return { error: friendlyError(error) };
  revalidate();
}

export async function cancelShiftAction(shiftId: string, wholeSeries: boolean): Promise<Result & { cancelled?: number }> {
  if (!uuid.safeParse(shiftId).success) return { error: "Turno inválido." };
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_shift", { p_shift_id: shiftId, p_whole_series: wholeSeries });
  if (error) return { error: friendlyError(error) };
  revalidate();
  return { cancelled: data ?? 0 };
}

export async function deleteShiftAction(shiftId: string): Promise<Result | void> {
  if (!uuid.safeParse(shiftId).success) return { error: "Turno inválido." };
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_shift", { p_shift_id: shiftId });
  if (error) return { error: friendlyError(error) };
  revalidate();
}

// RN09: liberação de vaga pela coordenação (inclui UC07)
export async function releaseEnrollmentAction(enrollmentId: string): Promise<Result & { promoted?: number }> {
  if (!uuid.safeParse(enrollmentId).success) return { error: "Inscrição inválida." };
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("release_enrollment", { p_enrollment_id: enrollmentId });
  if (error) return { error: friendlyError(error) };
  revalidate();
  return { promoted: Number((data as Record<string, unknown> | null)?.promoted ?? 0) };
}

// UC08 — RF35. Os horários são digitados em Brasília no dia do turno.
export async function markAttendanceAction(input: {
  enrollment_id: string;
  status: "attended" | "absent" | "excused";
  check_in?: string;
  check_out?: string;
  shift_starts_at: string;
}): Promise<Result & { worked_minutes?: number }> {
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  await requireUser();
  const { date } = utcToLocalParts(input.shift_starts_at);
  const v = parsed.data;
  const withTimes = v.status === "attended" && v.check_in && v.check_out;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_attendance", {
    p_enrollment_id: v.enrollment_id,
    p_status: v.status,
    ...(withTimes
      ? {
          p_checked_in_at: localToUtcIso(date, v.check_in!),
          p_checked_out_at: localToUtcIso(date, v.check_out!),
        }
      : {}),
  });
  if (error) return { error: friendlyError(error) };
  revalidate();
  revalidatePath("/profile");
  return { worked_minutes: data?.worked_minutes ?? 0 };
}

// UC13 — RF40
export async function liftBlockAction(blockId: string): Promise<Result | void> {
  if (!uuid.safeParse(blockId).success) return { error: "Bloqueio inválido." };
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("lift_volunteer_block", { p_block_id: blockId });
  if (error) return { error: friendlyError(error) };
  revalidate();
}
