"use client";

import { useState, useTransition } from "react";
import { Clock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ENROLLMENT_BADGE,
  TASK_LABEL,
  enrollmentLabel,
  vacanciesLabel,
  type EnrollmentStatus,
  type ShiftTask,
} from "@/lib/volunteering/labels";
import { dayKey, formatDate, formatDayLabel, formatTimeRange } from "@/lib/volunteering/time";
import { enrollAction } from "./actions";

export type AgendaShift = {
  id: string;
  shelter_id: string;
  shelter_name: string;
  title: string;
  task_type: ShiftTask;
  description: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  my_status: EnrollmentStatus | null;
  my_waitlist_position: number | null;
  blocked_until: string | null;
};

export function AgendaList({ shifts }: { shifts: AgendaShift[] }) {
  const [selected, setSelected] = useState<AgendaShift | null>(null);
  const [pending, startTransition] = useTransition();

  if (shifts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
        Nenhum turno disponível neste período. Use as setas para ver outras datas.
      </div>
    );
  }

  const groups = new Map<string, AgendaShift[]>();
  for (const s of shifts) {
    const k = dayKey(s.starts_at);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  }

  const full = selected ? selected.confirmed_count >= selected.capacity : false;

  const confirm = () => {
    if (!selected) return;
    const shift = selected;
    startTransition(async () => {
      const r = await enrollAction(shift.id);
      if (r.error) {
        toast.error(r.error, { duration: 8000 });
      } else if (r.already_enrolled) {
        toast.info(`Você já está ${r.status === "waitlisted" ? `na lista de espera (posição ${r.waitlist_position})` : "inscrito"} neste turno.`);
      } else if (r.status === "waitlisted") {
        toast.warning(`O turno lotou. Você entrou na lista de espera na posição ${r.waitlist_position}.`, { duration: 8000 });
      } else {
        toast.success(`Inscrição confirmada em "${shift.title}".`, { duration: 6000 });
      }
      setSelected(null);
    });
  };

  return (
    <>
      <div className="space-y-6">
        {[...groups.entries()].map(([key, items]) => (
          <div key={key}>
            <h3 className="text-base font-semibold text-gray-700 mb-2 first-letter:uppercase">{formatDayLabel(items[0].starts_at)}</h3>
            <ul className="space-y-3">
              {items.map((s) => (
                <ShiftCard key={s.id} shift={s} onJoin={() => setSelected(s)} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!selected}
        title={full ? "Entrar na lista de espera?" : "Confirmar inscrição?"}
        confirmLabel={full ? "Entrar na fila" : "Confirmar inscrição"}
        pending={pending}
        onConfirm={confirm}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <p className="font-semibold text-gray-900">{selected.title}</p>
            <p>{selected.shelter_name}</p>
            <p>
              {formatDate(selected.starts_at)}, das {formatTimeRange(selected.starts_at, selected.ends_at)}
            </p>
            {full ? (
              <p className="text-amber-800">
                O turno está lotado. Se uma vaga for liberada, a primeira pessoa da fila é confirmada automaticamente e
                recebe um aviso.
              </p>
            ) : (
              <p className="text-gray-600">
                Você poderá cancelar até 12 horas antes do início. Se a última vaga for ocupada antes da sua confirmação,
                você entra na lista de espera.
              </p>
            )}
          </>
        )}
      </ConfirmDialog>
    </>
  );
}

function ShiftCard({ shift, onJoin }: { shift: AgendaShift; onJoin: () => void }) {
  const left = shift.capacity - shift.confirmed_count;
  const full = left <= 0;
  const waitlistFull = full && shift.waitlist_count >= 5;

  return (
    <li className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
              {TASK_LABEL[shift.task_type]}
            </span>
            {shift.my_status && (
              <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${ENROLLMENT_BADGE[shift.my_status]}`}>
                {enrollmentLabel(shift.my_status, shift.my_waitlist_position)}
              </span>
            )}
          </div>
          <h4 className="text-lg font-bold text-gray-900 break-words">{shift.title}</h4>
          <p className="flex items-center gap-2 text-gray-700">
            <Clock className="w-4 h-4 shrink-0" aria-hidden />
            {formatTimeRange(shift.starts_at, shift.ends_at)}
          </p>
          <p className="flex items-center gap-2 text-gray-700">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden />
            {shift.shelter_name}
          </p>
          <p className={`flex items-center gap-2 font-medium ${full ? "text-amber-800" : "text-green-800"}`}>
            <Users className="w-4 h-4 shrink-0" aria-hidden />
            {vacanciesLabel(shift.capacity, shift.confirmed_count, shift.waitlist_count)}
          </p>
          {shift.description && <p className="text-gray-600 break-words">{shift.description}</p>}
        </div>

        <div className="sm:w-48 shrink-0">
          {shift.my_status ? null : shift.blocked_until ? (
            <p className="text-sm text-red-800">Inscrições bloqueadas até {formatDate(shift.blocked_until)}.</p>
          ) : waitlistFull ? (
            <p className="text-sm text-gray-700">Turno lotado e lista de espera completa.</p>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              className={`w-full min-h-12 rounded-xl px-4 text-base font-semibold text-white ${
                full ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {full ? "Entrar na lista de espera" : "Quero participar"}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
