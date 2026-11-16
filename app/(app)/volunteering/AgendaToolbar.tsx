"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { moveAgenda, todayLocal, type AgendaView } from "@/lib/volunteering/time";
import { TASK_OPTIONS, type ShiftTask } from "@/lib/volunteering/labels";

export function AgendaToolbar({
  view,
  date,
  title,
  shelters,
  shelter,
  task,
}: {
  view: AgendaView;
  date: string;
  title: string;
  shelters: { id: string; name: string }[];
  shelter: string | null;
  task: ShiftTask | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`/volunteering?${next.toString()}`, { scroll: false });
  };

  const btn =
    "min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 text-base font-medium text-gray-800 hover:bg-gray-50";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className={btn} aria-label="Período anterior" onClick={() => go({ date: moveAgenda(view, date, -1) })}>
            <ChevronLeft className="w-5 h-5" aria-hidden />
          </button>
          <p className="text-lg font-semibold text-gray-900 min-w-0" aria-live="polite">
            {title}
          </p>
          <button type="button" className={btn} aria-label="Próximo período" onClick={() => go({ date: moveAgenda(view, date, 1) })}>
            <ChevronRight className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => go({ date: todayLocal() })}>
            Hoje
          </button>
          <div role="group" aria-label="Visualização" className="inline-flex rounded-xl border border-gray-300 overflow-hidden">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => go({ view: v })}
                className={`min-h-11 px-4 text-base font-medium ${
                  view === v ? "bg-blue-600 text-white" : "bg-white text-gray-800 hover:bg-gray-50"
                }`}
              >
                {v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Abrigo</span>
          <select
            value={shelter ?? ""}
            onChange={(e) => go({ shelter: e.target.value || null })}
            className="w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base"
          >
            <option value="">Todos os meus abrigos</option>
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1">Tipo de tarefa</span>
          <select
            value={task ?? ""}
            onChange={(e) => go({ task: e.target.value || null })}
            className="w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base"
          >
            <option value="">Todas as tarefas</option>
            {TASK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
