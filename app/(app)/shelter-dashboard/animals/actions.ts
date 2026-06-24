"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";

const baseSchema = z.object({
  shelter_id: z.string().uuid(),
  name: z.string().optional().nullable(),
  species: z.enum(["dog", "cat", "other"]),
  breed: z.string().optional().nullable(),
  size: z.enum(["small", "medium", "large"]),
  estimated_age_months: z.number().int().min(0),
  neutered: z.boolean(),
  health_notes: z.string().optional().nullable(),
  temperament: z.array(z.string()).optional().nullable(),
  cover_url: z.string().url("URL inválida").optional().or(z.literal("")).nullable(),
  status: z.enum(["available", "reserved", "adopted", "unavailable"]).optional(),
});

export type AnimalValues = z.infer<typeof baseSchema>;

function normalize(values: AnimalValues) {
  return {
    shelter_id: values.shelter_id,
    name: values.name?.trim() || null,
    species: values.species,
    breed: values.breed?.trim() || null,
    size: values.size,
    estimated_age_months: values.estimated_age_months,
    neutered: values.neutered,
    health_notes: values.health_notes?.trim() || null,
    temperament:
      values.temperament && values.temperament.length > 0
        ? values.temperament
        : null,
    cover_url: values.cover_url || null,
    status: values.status ?? "available",
  };
}

export async function createAnimalAction(
  values: AnimalValues,
): Promise<{ error?: string } | void> {
  const parsed = baseSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("animals").insert(normalize(parsed.data));
  if (error) return { error: error.message };

  revalidatePath("/shelter-dashboard");
  revalidatePath("/animals");
  redirect("/shelter-dashboard");
}

export async function updateAnimalAction(
  id: string,
  values: AnimalValues,
): Promise<{ error?: string } | void> {
  const parsed = baseSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("animals")
    .update(normalize(parsed.data))
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/shelter-dashboard");
  revalidatePath(`/animals/${id}`);
  redirect("/shelter-dashboard");
}

export async function deleteAnimalAction(
  id: string,
): Promise<{ error?: string } | void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("animals").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/shelter-dashboard");
  revalidatePath("/animals");
  redirect("/shelter-dashboard");
}
