"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignupValues = {
  email: string;
  password: string;
  intent?: "default" | "shelter";
};

const INTENT_COOKIE = "signup_intent";

export async function signupAction(
  values: SignupValues,
): Promise<{ error?: string; needsConfirm?: boolean } | void> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/onboarding/profile`,
    },
  });

  if (error) return { error: error.message };

  if (values.intent === "shelter") {
    const store = await cookies();
    store.set(INTENT_COOKIE, "shelter", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60, // 1h é suficiente para concluir o onboarding
      path: "/",
    });
  }

  if (data.session) {
    redirect("/onboarding/profile");
  }

  return { needsConfirm: true };
}
