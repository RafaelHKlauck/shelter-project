"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { geocode, toWktPoint } from "@/lib/geo/geocode";
import { onlyDigits } from "@/lib/validation/cpf";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  description: z.string().optional(),
  needs_supplies: z.boolean().optional(),
  address_line: z.string().min(2),
  address_city: z.string().min(2),
  address_state: z.string().length(2),
  address_zip: z.string(),
});

export type OnboardShelterValues = z.infer<typeof schema>;

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function onboardShelterAction(
  values: OnboardShelterValues,
): Promise<{ error?: string } | void> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const fullAddress = [
    parsed.data.address_line,
    parsed.data.address_city,
    parsed.data.address_state,
    "Brazil",
  ].join(", ");
  const geo = await geocode(fullAddress);

  if (!geo) {
    return {
      error:
        "Não foi possível localizar o endereço. Verifique e tente novamente.",
    };
  }

  const baseSlug = slugify(parsed.data.name);
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;

  const { error } = await supabase.from("shelters").insert({
    name: parsed.data.name,
    slug,
    phone: parsed.data.phone,
    email: parsed.data.email || null,
    description: parsed.data.description || null,
    address_line: parsed.data.address_line,
    address_city: parsed.data.address_city,
    address_state: parsed.data.address_state.toUpperCase(),
    address_zip: onlyDigits(parsed.data.address_zip).padStart(8, "0"),
    location: toWktPoint(geo) as unknown as never,
    needs_supplies: parsed.data.needs_supplies ?? false,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  redirect("/shelter-dashboard");
}
