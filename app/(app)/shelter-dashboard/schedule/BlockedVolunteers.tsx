"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/volunteering/time";
import { liftBlockAction } from "../schedule-actions";

export type BlockRow = {
  id: string;
  user_id: string;
  full_name: string;
  reason: string;
  blocked_until: string;
  created_at: string;
};

/** UC13 — RF40 */
export function BlockedVolunteers({ blocks }: { blocks: BlockRow[] }) {
  const [pending, startTransition] = useTransition();

  const lift = (b: BlockRow) =>
    startTransition(async () => {
      const r = await liftBlockAction(b.id);
      if (r?.error) toast.error(r.error);
      else toast.success(`Bloqueio de ${b.full_name} removido.`);
    });

  return (
    <section aria-labelledby="blocked-title">
      <h2 id="blocked-title" className="text-xl font-bold text-gray-900 mb-3">Voluntários bloqueados</h2>
      {blocks.length === 0 ? (
        <p className="text-gray-600">Nenhum voluntário bloqueado.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
          {blocks.map((b) => (
            <li key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{b.full_name}</p>
                <p className="text-sm text-gray-600">
                  {b.reason}. Bloqueado em {formatDate(b.created_at)} até {formatDate(b.blocked_until)}.
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => lift(b)}
                className="min-h-11 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
              >
                Remover bloqueio
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
