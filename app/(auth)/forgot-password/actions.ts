"use server";

import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(values: {
  email: string;
}): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
