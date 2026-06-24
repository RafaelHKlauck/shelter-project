"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";

const volunteerSchema = z.object({
  shelter_id: z.string().uuid(),
  message: z.string().optional().nullable(),
});

export async function createVolunteerRequestAction(
  values: z.infer<typeof volunteerSchema>,
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = volunteerSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await requireUser();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("requests")
    .select("id")
    .eq("requester_id", user.id)
    .eq("shelter_id", parsed.data.shelter_id)
    .eq("kind", "volunteer")
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return {
      error: "Você já tem uma solicitação de voluntariado pendente para este abrigo.",
    };
  }

  const { error } = await supabase.from("requests").insert({
    kind: "volunteer",
    shelter_id: parsed.data.shelter_id,
    requester_id: user.id,
    message: parsed.data.message?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/shelters/${parsed.data.shelter_id}`);
  return { ok: true };
}

const supplySchema = z.object({
  shelter_id: z.string().uuid(),
  supply_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um item"),
});

export async function createSupplyRequestsAction(
  values: z.infer<typeof supplySchema>,
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = supplySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await requireUser();
  const supabase = await createClient();

  const rows = parsed.data.supply_ids.map((id) => ({
    kind: "supply" as const,
    shelter_id: parsed.data.shelter_id,
    requester_id: user.id,
    supply_need_id: id,
  }));

  const { error } = await supabase.from("requests").insert(rows);
  if (error) return { error: error.message };
  revalidatePath(`/shelters/${parsed.data.shelter_id}`);
  return { ok: true };
}
