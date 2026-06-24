import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  MessagesView,
  type ConversationRow,
  type Message,
} from "./MessagesView";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const user = await requireUser();
  const { conversation: requestedId } = await searchParams;
  const supabase = await createClient();

  const { data: convs } = await supabase
    .from("conversations")
    .select(
      "id, last_message_at, last_message_preview, requester_id, shelter_id, requester_last_read_at, shelter_last_read_at, request:requests(id, kind, animal:animals(id, name))",
    )
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const list = convs ?? [];
  const shelterIds = Array.from(new Set(list.map((c) => c.shelter_id)));
  const requesterIds = Array.from(new Set(list.map((c) => c.requester_id)));

  const [{ data: shelters }, { data: profiles }] = await Promise.all([
    shelterIds.length > 0
      ? supabase
          .from("shelters")
          .select("id, name, cover_url")
          .in("id", shelterIds)
      : Promise.resolve({ data: [] as { id: string; name: string; cover_url: string | null }[] }),
    requesterIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", requesterIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; avatar_url: string | null }[] }),
  ]);

  const shelterMap = new Map((shelters ?? []).map((s) => [s.id, s]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows: ConversationRow[] = list.map((c) => {
    const isRequester = c.requester_id === user.id;
    const shelter = shelterMap.get(c.shelter_id);
    const profile = profileMap.get(c.requester_id);
    const lastReadAt = isRequester
      ? c.requester_last_read_at
      : c.shelter_last_read_at;
    const hasUnread = Boolean(
      c.last_message_at &&
        (!lastReadAt || new Date(c.last_message_at) > new Date(lastReadAt)),
    );
    return {
      id: c.id,
      otherName: isRequester
        ? shelter?.name ?? "Abrigo"
        : profile?.full_name ?? "Solicitante",
      otherAvatar: isRequester
        ? shelter?.cover_url ?? null
        : profile?.avatar_url ?? null,
      animalName: c.request?.animal?.name ?? null,
      preview: c.last_message_preview,
      lastAt: c.last_message_at,
      hasUnread,
    };
  });

  const activeId =
    rows.find((r) => r.id === requestedId)?.id ?? rows[0]?.id ?? null;
  const activeConversation = rows.find((r) => r.id === activeId) ?? null;

  let initialMessages: Message[] = [];
  if (activeId) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", activeId)
      .order("created_at", { ascending: true });
    initialMessages = msgs ?? [];
  }

  return (
    <MessagesView
      userId={user.id}
      conversations={rows}
      activeId={activeId}
      activeConversation={activeConversation}
      initialMessages={initialMessages}
    />
  );
}
