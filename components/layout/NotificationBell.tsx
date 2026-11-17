"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { describeNotification } from "@/lib/volunteering/notifications";

type Row = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

const SELF_ACTION_KINDS = new Set(["shift.enrolled", "shift.waitlisted"]);

function ago(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

/**
 * Sino de notificações (RF18 do AdotaPet + avisos da escala). Escuta a tabela
 * notifications pelo Realtime: confirmações, promoções da fila, cancelamentos e lembretes.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase
      .from("notifications")
      .select("id, kind, payload, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (active) setItems((data ?? []) as Row[]);
      });
    const ch = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as Row;
          setItems((prev) => [row, ...prev.filter((p) => p.id !== row.id)].slice(0, 20));
          // a própria tela já confirma as ações da pessoa; o aviso flutuante fica para o que vem de fora
          if (!SELF_ACTION_KINDS.has(row.kind)) toast(describeNotification(row.kind, row.payload).title);
        },
      );
    ensureRealtimeAuth(supabase).then(() => {
      if (active) ch.subscribe();
    });
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((i) => !i.read_at).length;

  const markAllRead = async () => {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((p) => (p.read_at ? p : { ...p, read_at: now })));
    await createClient().from("notifications").update({ read_at: now }).in("id", ids);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={unread ? `Notificações: ${unread} ${unread === 1 ? "não lida" : "não lidas"}` : "Notificações"}
        className="relative flex items-center justify-center min-w-11 min-h-11 rounded-lg text-gray-600 hover:bg-gray-50"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-12 sm:w-96 max-h-[70vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-gray-900">Notificações</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-sm text-blue-700 hover:underline min-h-11 px-2">
                Marcar todas como lidas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-gray-600 text-center">Nenhuma notificação.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((n) => {
                const t = describeNotification(n.kind, n.payload);
                const content = (
                  <>
                    <p className={`text-base ${n.read_at ? "text-gray-700" : "text-gray-900 font-semibold"}`}>
                      {!n.read_at && <span className="sr-only">Não lida: </span>}
                      {t.title}
                    </p>
                    {t.body && <p className="text-sm text-gray-600">{t.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{ago(n.created_at)}</p>
                  </>
                );
                return (
                  <li key={n.id} className={n.read_at ? "" : "bg-blue-50/50"}>
                    {t.href ? (
                      <Link href={t.href} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-gray-50">
                        {content}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
