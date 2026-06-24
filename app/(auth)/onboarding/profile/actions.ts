"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";
import { formatCPF, hashCPF, isValidCPF, onlyDigits } from "@/lib/validation/cpf";
import { geocodeAddress, toWktPoint } from "@/lib/geo/geocode";

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
  const cpfFormatted = formatCPF(parsed.data.cpf);

  const geo = await geocodeAddress({
    line: parsed.data.address_line,
    number: parsed.data.address_number ?? null,
    city: parsed.data.address_city,
    state: parsed.data.address_state,
    zip: parsed.data.address_zip,
  });

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: parsed.data.full_name,
    cpf_hash: cpfHash,
    cpf_encrypted: cpfFormatted,
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

  // Se o usuário veio do fluxo "Cadastrar meu abrigo", redireciona para o
  // onboarding do abrigo. Caso contrário, manda para a home.
  const store = await cookies();
  const intent = store.get("signup_intent")?.value;
  if (intent === "shelter") {
    store.delete("signup_intent");
    redirect("/onboarding/shelter");
  }

  redirect("/");
}
