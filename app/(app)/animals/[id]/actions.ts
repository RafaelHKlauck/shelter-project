"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";

const schema = z.object({
  animal_id: z.string().uuid(),
  message: z.string().optional().nullable(),
});

export async function createAdoptionRequestAction(
  values: z.infer<typeof schema>,
): Promise<{ error?: string; ok?: boolean }> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await requireUser();
  const supabase = await createClient();

  const { data: animal } = await supabase
    .from("animals")
    .select("id, shelter_id, status")
    .eq("id", parsed.data.animal_id)
    .maybeSingle();

  if (!animal) return { error: "Animal não encontrado." };
  if (animal.status !== "available") {
    return { error: "Este animal não está mais disponível para adoção." };
  }

  const { data: existing } = await supabase
    .from("requests")
    .select("id, status")
    .eq("requester_id", user.id)
    .eq("animal_id", parsed.data.animal_id)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existing) {
    return {
      error:
        existing.status === "pending"
          ? "Você já tem uma solicitação pendente para este animal."
          : "Você já tem uma solicitação aprovada para este animal.",
    };
  }

  const { error } = await supabase.from("requests").insert({
    kind: "adoption",
    shelter_id: animal.shelter_id,
    requester_id: user.id,
    animal_id: animal.id,
    message: parsed.data.message?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/animals/${animal.id}`);
  revalidatePath("/profile");
  return { ok: true };
}
