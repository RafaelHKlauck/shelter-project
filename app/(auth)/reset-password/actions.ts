"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function resetPasswordAction(values: {
  password: string;
}): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: values.password });
  if (error) return { error: error.message };
  redirect("/");
}
