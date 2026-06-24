"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { onlyDigits } from "@/lib/validation/cpf";
import { geocodeAddress, toWktPoint } from "@/lib/geo/geocode";
import type { Database } from "@/lib/supabase/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const schema = z.object({
  full_name: z.string().min(2),
  birth_date: z.string().min(1),
  housing_type: z.enum(["house", "apartment"]),
  address_line: z.string().min(2),
  address_number: z.string().optional().nullable(),
  address_city: z.string().min(2),
  address_state: z.string().length(2),
  address_zip: z.string(),
  avatar_url: z.string().url("URL inválida").optional().or(z.literal("")).nullable(),
  regeocode: z.boolean().optional(),
});

export type UpdateProfileValues = z.infer<typeof schema>;

export async function updateProfileAction(
  values: UpdateProfileValues,
): Promise<{ error?: string } | void> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const user = await requireUser();
  const supabase = await createClient();

  let location: string | undefined;
  if (parsed.data.regeocode) {
    const geo = await geocodeAddress({
      line: parsed.data.address_line,
      number: parsed.data.address_number ?? null,
      city: parsed.data.address_city,
      state: parsed.data.address_state,
      zip: parsed.data.address_zip,
    });
    if (geo) location = toWktPoint(geo);
  }

  const update: ProfileUpdate = {
    full_name: parsed.data.full_name,
    birth_date: parsed.data.birth_date,
    housing_type: parsed.data.housing_type,
    address_line: parsed.data.address_line,
    address_number: parsed.data.address_number ?? null,
    address_city: parsed.data.address_city,
    address_state: parsed.data.address_state.toUpperCase(),
    address_zip: onlyDigits(parsed.data.address_zip).padStart(8, "0"),
    avatar_url: parsed.data.avatar_url || null,
  };
  if (location) update.location = location as unknown as never;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  revalidatePath("/shelter-dashboard");
  redirect("/profile");
}
