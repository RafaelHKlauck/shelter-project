"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { markConversationReadAction } from "./actions";

export type ConversationRow = {
  id: string;
  otherName: string;
  otherAvatar: string | null;
  animalName: string | null;
  preview: string | null;
  lastAt: string | null;
  hasUnread: boolean;
};

export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=200";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessagesView({
  userId,
  conversations,
  activeId,
  activeConversation,
  initialMessages,
}: {
  userId: string;
  conversations: ConversationRow[];
  activeId: string | null;
  activeConversation: ConversationRow | null;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);

  // reset local messages when activeId changes (props update)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, activeId]);

  // mark as read + realtime subscribe per active conversation
  useEffect(() => {
    if (!activeId) return;
    markConversationReadAction(activeId);

    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const incoming = payload.new as Message;
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  // auto-scroll bottom
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const selectConversation = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("conversation", id);
    router.push(`/messages?${next.toString()}`);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeId,
        sender_id: userId,
        body: text,
      });
      if (error) toast.error(error.message);
      else setDraft("");
    });
  };

  if (conversations.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Nenhuma conversa ainda
          </h2>
          <p className="text-gray-600">
            As conversas serão criadas automaticamente quando uma solicitação de
            adoção ou doação for aceita.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div
        className="bg-white rounded-xl border border-gray-200 overflow-hidden flex"
        style={{ height: "calc(100vh - 12rem)" }}
      >
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Mensagens</h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left ${
                  activeId === c.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.otherAvatar ?? FALLBACK_AVATAR}
                    alt={c.otherName}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-gray-900 truncate">
                        {c.otherName}
                      </p>
                      {c.hasUnread && (
                        <span className="w-2.5 h-2.5 bg-blue-600 rounded-full" />
                      )}
                    </div>

                    {c.animalName && (
                      <p className="text-xs text-gray-500 mb-1">
                        Adoção: {c.animalName}
                      </p>
                    )}

                    <p className="text-sm text-gray-600 truncate">
                      {c.preview ?? "Sem mensagens ainda"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="font-bold text-gray-900">
                  {activeConversation.otherName}
                </h3>
                {activeConversation.animalName && (
                  <p className="text-sm text-gray-600">
                    Adoção: {activeConversation.animalName}
                  </p>
                )}
              </div>

              <div
                ref={scrollerRef}
                className="flex-1 overflow-y-auto p-4 bg-gray-50"
              >
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">
                    Comece a conversa enviando uma mensagem.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {messages.map((m) => {
                      const isMe = m.sender_id === userId;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg ${
                              isMe
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-200 text-gray-900"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {m.body}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isMe ? "text-blue-100" : "text-gray-500"
                              }`}
                            >
                              {formatTime(m.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !draft.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-5 h-5" />
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Selecione uma conversa
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
