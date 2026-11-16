"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ENROLLMENT_BADGE, TASK_LABEL, enrollmentLabel, type EnrollmentStatus, type ShiftTask } from "@/lib/volunteering/labels";
import { canSelfCancel, formatDate, formatTimeRange } from "@/lib/volunteering/time";
import { cancelEnrollmentAction } from "./actions";

export type MyEnrollment = {
  id: string;
  status: EnrollmentStatus;
  waitlist_position: number | null;
  shift_id: string;
  title: string;
  task_type: ShiftTask;
  starts_at: string;
  ends_at: string;
  shelter_name: string;
};

/** Área "Meus turnos": inscrições ativas e posição na fila (UC06). */
export function MyShifts({ enrollments, nowIso }: { enrollments: MyEnrollment[]; nowIso: string }) {
  const [selected, setSelected] = useState<MyEnrollment | null>(null);
  const [pending, startTransition] = useTransition();
  const now = new Date(nowIso);

  const confirm = () => {
    if (!selected) return;
    startTransition(async () => {
      const r = await cancelEnrollmentAction(selected.id);
      if (r.error) toast.error(r.error, { duration: 8000 });
      else toast.success(selected.status === "waitlisted" ? "Você saiu da lista de espera." : "Inscrição cancelada.");
      setSelected(null);
    });
  };

  return (
    <section aria-labelledby="my-shifts-title" className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
      <h2 id="my-shifts-title" className="text-xl font-bold text-gray-900 mb-3">
        Meus turnos
      </h2>
      {enrollments.length === 0 ? (
        <p className="text-gray-600">Você ainda não está inscrito em nenhum turno.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {enrollments.map((e) => {
            // waitlist não tem prazo; confirmados até 12h antes (RN09). O banco confere de novo.
            const canCancel = e.status === "waitlisted" || canSelfCancel(e.starts_at, now);
            return (
              <li key={e.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${ENROLLMENT_BADGE[e.status]}`}>
                      {enrollmentLabel(e.status, e.waitlist_position)}
                    </span>
                    <span className="text-sm text-gray-600">{TASK_LABEL[e.task_type]}</span>
                  </div>
                  <p className="font-semibold text-gray-900 break-words">{e.title}</p>
                  <p className="text-gray-700">
                    {formatDate(e.starts_at)}, {formatTimeRange(e.starts_at, e.ends_at)} · {e.shelter_name}
                  </p>
                </div>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => setSelected(e)}
                    className="min-h-11 px-4 rounded-xl border border-red-300 text-red-700 text-base font-medium hover:bg-red-50"
                  >
                    {e.status === "waitlisted" ? "Sair da fila" : "Cancelar inscrição"}
                  </button>
                ) : (
                  <p className="text-sm text-gray-700 sm:max-w-56">
                    Faltam menos de 12 horas. Para cancelar, fale com a coordenação do abrigo.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!selected}
        title={selected?.status === "waitlisted" ? "Sair da lista de espera?" : "Cancelar inscrição?"}
        confirmLabel={selected?.status === "waitlisted" ? "Sair da fila" : "Cancelar inscrição"}
        tone="danger"
        pending={pending}
        onConfirm={confirm}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <p>
            {selected.title} — {formatDate(selected.starts_at)}, {formatTimeRange(selected.starts_at, selected.ends_at)}.
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
