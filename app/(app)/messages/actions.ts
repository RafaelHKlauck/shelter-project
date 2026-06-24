"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/server";

export async function markConversationReadAction(
  conversationId: string,
): Promise<{ error?: string } | void> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("conversations")
    .select("requester_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return { error: "Conversa não encontrada." };

  const isRequester = conv.requester_id === user.id;
  const now = new Date().toISOString();
  const update = isRequester
    ? { requester_last_read_at: now }
    : { shelter_last_read_at: now };

  const { error } = await supabase
    .from("conversations")
    .update(update)
    .eq("id", conversationId);

  if (error) return { error: error.message };
  revalidatePath("/messages");
}
