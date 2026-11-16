"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";

/**
 * RNF14: quando alguém se inscreve ou cancela, os contadores de volunteer_shifts mudam
 * e todas as agendas abertas recarregam os dados do servidor (sem recarregar a página).
 */
export function RealtimeRefresh({ channel, shelterIds }: { channel: string; shelterIds: string[] }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = shelterIds.slice().sort().join(",");

  useEffect(() => {
    if (!key) return;
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 250);
    };
    const ch = supabase.channel(`${channel}:${key}`);
    for (const id of key.split(",")) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "volunteer_shifts", filter: `shelter_id=eq.${id}` }, refresh);
    }
    ch.on("postgres_changes", { event: "*", schema: "public", table: "shift_enrollments" }, refresh);
    let active = true;
    ensureRealtimeAuth(supabase).then(() => {
      if (active) ch.subscribe();
    });
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
  }, [channel, key, router]);

  return null;
}
