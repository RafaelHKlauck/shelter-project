"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { friendlyError } from "@/lib/volunteering/errors";

export type EnrollResult = {
  error?: string;
  status?: "confirmed" | "waitlisted";
  waitlist_position?: number | null;
  already_enrolled?: boolean;
};

const id = z.string().uuid();

/** UC04/UC05 — a regra toda (vagas, fila, conflito, bloqueio) fica em enroll_in_shift. */
export async function enrollAction(shiftId: string): Promise<EnrollResult> {
  if (!id.safeParse(shiftId).success) return { error: "Turno inválido." };
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("enroll_in_shift", { p_shift_id: shiftId });
  if (error) return { error: friendlyError(error) };

  revalidatePath("/volunteering");
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    status: r.status as EnrollResult["status"],
    waitlist_position: (r.waitlist_position as number | null) ?? null,
    already_enrolled: Boolean(r.already_enrolled),
  };
}

/** UC06 — prazo de 12 horas conferido no banco (RN09, RNF13). */
export async function cancelEnrollmentAction(
  enrollmentId: string,
): Promise<{ error?: string; promoted?: number }> {
  if (!id.safeParse(enrollmentId).success) return { error: "Inscrição inválida." };
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_enrollment", { p_enrollment_id: enrollmentId });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/volunteering");
  return { promoted: Number((data as Record<string, unknown> | null)?.promoted ?? 0) };
}
