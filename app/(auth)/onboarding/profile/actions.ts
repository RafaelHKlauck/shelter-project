"use server";

import { redirect } from "next/navigation";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { hashCPF, isValidCPF, onlyDigits } from "@/lib/validation/cpf";
import { geocode, toWktPoint } from "@/lib/geo/geocode";

const schema = z.object({
  full_name: z.string().min(2),
  cpf: z.string().refine(isValidCPF, "CPF inválido"),
  birth_date: z.string(),
  housing_type: z.enum(["house", "apartment"]),
  address_line: z.string().min(2),
  address_number: z.string().optional().nullable(),
  address_city: z.string().min(2),
  address_state: z.string().length(2),
  address_zip: z.string(),
});

export type OnboardProfileValues = z.infer<typeof schema>;

export async function onboardProfileAction(
  values: OnboardProfileValues,
): Promise<{ error?: string } | void> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const cpfHash = await hashCPF(parsed.data.cpf);

  const fullAddress = [
    parsed.data.address_line,
    parsed.data.address_number,
    parsed.data.address_city,
    parsed.data.address_state,
    "Brazil",
  ]
    .filter(Boolean)
    .join(", ");

  const geo = await geocode(fullAddress);

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: parsed.data.full_name,
    cpf_hash: cpfHash,
    birth_date: parsed.data.birth_date,
    housing_type: parsed.data.housing_type,
    address_line: parsed.data.address_line,
    address_number: parsed.data.address_number ?? null,
    address_city: parsed.data.address_city,
    address_state: parsed.data.address_state.toUpperCase(),
    address_zip: onlyDigits(parsed.data.address_zip).padStart(8, "0"),
    location: geo ? (toWktPoint(geo) as unknown as never) : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Este CPF já está cadastrado em outra conta." };
    }
    return { error: error.message };
  }

  redirect("/");
}
