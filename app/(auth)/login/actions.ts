"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginValues = {
  email: string;
  password: string;
};

export async function loginAction(
  values: LoginValues,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });
  if (error) return { error: error.message };

  // Após autenticar, decide o destino: onboarding se não tem profile, / caso contrário
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão não pôde ser criada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile ? "/" : "/onboarding/profile");
}
