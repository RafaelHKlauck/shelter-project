"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { geocodeAddress, toWktPoint } from "@/lib/geo/geocode";
import { onlyDigits } from "@/lib/validation/cpf";
import type { Database } from "@/lib/supabase/types";

type ShelterUpdate = Database["public"]["Tables"]["shelters"]["Update"];

const updateShelterSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  description: z.string().optional().nullable(),
  needs_supplies: z.boolean(),
  cover_url: z.string().url().optional().or(z.literal("")).nullable(),
  address_line: z.string().min(2),
  address_city: z.string().min(2),
  address_state: z.string().length(2),
  address_zip: z.string(),
  regeocode: z.boolean().optional(),
});

export type UpdateShelterValues = z.infer<typeof updateShelterSchema>;

export async function updateShelterAction(
  values: UpdateShelterValues,
): Promise<{ error?: string } | void> {
  const parsed = updateShelterSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await requireUser();
  const supabase = await createClient();

  let location: string | undefined;
  if (parsed.data.regeocode) {
    const geo = await geocodeAddress({
      line: parsed.data.address_line,
      city: parsed.data.address_city,
      state: parsed.data.address_state,
      zip: parsed.data.address_zip,
    });
    if (geo) location = toWktPoint(geo);
  }

  const update: ShelterUpdate = {
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    description: parsed.data.description || null,
    needs_supplies: parsed.data.needs_supplies,
    cover_url: parsed.data.cover_url || null,
    address_line: parsed.data.address_line,
    address_city: parsed.data.address_city,
    address_state: parsed.data.address_state.toUpperCase(),
    address_zip: onlyDigits(parsed.data.address_zip).padStart(8, "0"),
  };
  if (location) update.location = location as unknown as never;

  const { error } = await supabase
    .from("shelters")
    .update(update)
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };
  revalidatePath("/shelter-dashboard");
  revalidatePath(`/shelters/${parsed.data.id}`);
}

const addSupplySchema = z.object({
  shelter_id: z.string().uuid(),
  title: z.string().min(2),
  quantity_target: z.number().int().positive().optional().nullable(),
  unit: z.string().optional().nullable(),
});

export async function addSupplyAction(
  values: z.infer<typeof addSupplySchema>,
): Promise<{ error?: string } | void> {
  const parsed = addSupplySchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("supply_needs").insert({
    shelter_id: parsed.data.shelter_id,
    title: parsed.data.title,
    quantity_target: parsed.data.quantity_target ?? null,
    unit: parsed.data.unit || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/shelter-dashboard");
  revalidatePath(`/shelters/${parsed.data.shelter_id}`);
}

export async function deleteSupplyAction(values: {
  id: string;
  shelter_id: string;
}): Promise<{ error?: string } | void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("supply_needs")
    .delete()
    .eq("id", values.id);
  if (error) return { error: error.message };
  revalidatePath("/shelter-dashboard");
  revalidatePath(`/shelters/${values.shelter_id}`);
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["accepted", "rejected", "finalized", "cancelled"]),
});

export async function setRequestStatusAction(
  values: z.infer<typeof statusSchema>,
): Promise<{ error?: string } | void> {
  const parsed = statusSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("requests")
    .update({ status: parsed.data.status, decided_by: user.id })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };
  revalidatePath("/shelter-dashboard");
  revalidatePath("/messages");
  revalidatePath("/profile");
}
