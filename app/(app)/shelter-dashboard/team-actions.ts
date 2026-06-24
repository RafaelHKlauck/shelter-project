"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v3";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";

const schema = z.object({
  shelter_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(["admin", "editor", "volunteer"]),
});

export async function setMemberRoleAction(
  values: z.infer<typeof schema>,
): Promise<{ error?: string } | void> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("shelter_members")
    .update({ role: parsed.data.role })
    .eq("shelter_id", parsed.data.shelter_id)
    .eq("user_id", parsed.data.user_id);

  if (error) return { error: error.message };
  revalidatePath("/shelter-dashboard");
}

export async function removeMemberAction(values: {
  shelter_id: string;
  user_id: string;
}): Promise<{ error?: string } | void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("shelter_members")
    .delete()
    .eq("shelter_id", values.shelter_id)
    .eq("user_id", values.user_id);

  if (error) return { error: error.message };
  revalidatePath("/shelter-dashboard");
}
