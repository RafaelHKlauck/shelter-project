"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Repeat } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ENROLLMENT_BADGE,
  SHIFT_STATUS_LABEL,
  TASK_LABEL,
  enrollmentLabel,
  vacanciesLabel,
  type EnrollmentStatus,
  type ShiftStatus,
  type ShiftTask,
} from "@/lib/volunteering/labels";
import {
  attendanceWindowOpen,
  formatDate,
  formatDayLabel,
  formatTimeRange,
  utcToLocalParts,
} from "@/lib/volunteering/time";
import { cancelShiftAction, deleteShiftAction, releaseEnrollmentAction } from "../schedule-actions";
import { ShiftForm } from "./ShiftForm";
import { AttendanceRow } from "./AttendanceRow";

export type ManagedEnrollment = {
  id: string;
  user_id: string;
  full_name: string;
  status: EnrollmentStatus;
  waitlist_position: number | null;
  enrolled_at: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  worked_minutes: number;
  attendance_marked_at: string | null;
};

export type ManagedShift = {
  id: string;
  title: string;
  task_type: ShiftTask;
  description: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  status: ShiftStatus;
  recurrence_group_id: string | null;
  enrollments: ManagedEnrollment[];
  has_any_enrollment: boolean;
};

export function ShiftList({ shelterId, shifts, nowIso }: { shelterId: string; shifts: ManagedShift[]; nowIso: string }) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const upcoming = shifts.filter((s) => s.ends_at > nowIso && s.status !== "cancelled");
  const past = shifts.filter((s) => s.ends_at <= nowIso || s.status === "cancelled").reverse();
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <section aria-labelledby="shifts-title">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 id="shifts-title" className="text-xl font-bold text-gray-900">Turnos</h2>
        <div role="tablist" className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
          {(
            [
              ["upcoming", `Próximos (${upcoming.length})`],
              ["past", `Encerrados e cancelados (${past.length})`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              type="button"
              onClick={() => setTab(k)}
              className={`min-h-11 px-4 text-sm font-medium ${tab === k ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-gray-600">
          {tab === "upcoming" ? "Nenhum turno agendado. Cadastre um acima." : "Nenhum turno encerrado nos últimos 14 dias."}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((s) => (
            <ShiftItem key={s.id} shelterId={shelterId} shift={s} nowIso={nowIso} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ShiftItem({ shelterId, shift, nowIso }: { shelterId: string; shift: ManagedShift; nowIso: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<null | "cancel" | "delete" | { release: ManagedEnrollment }>(null);
  const [pending, startTransition] = useTransition();

  const now = new Date(nowIso);
  const future = shift.starts_at > nowIso;
  const editable = shift.status === "scheduled" && future;
  const canMark = shift.status !== "cancelled" && attendanceWindowOpen(shift.starts_at, shift.ends_at, now);
  const confirmed = shift.enrollments.filter((e) => e.status !== "waitlisted");
  const waitlist = shift.enrollments.filter((e) => e.status === "waitlisted");

  const run = (fn: () => Promise<{ error?: string } | void>, ok: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r && r.error) toast.error(r.error, { duration: 8000 });
      else toast.success(ok);
      setDialog(null);
    });

  const startParts = utcToLocalParts(shift.starts_at);
  const endParts = utcToLocalParts(shift.ends_at);

  return (
    <li className="border border-gray-200 rounded-xl bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left p-4 flex items-start gap-3 min-h-11"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-600 first-letter:uppercase">
            {formatDayLabel(shift.starts_at)} · {formatTimeRange(shift.starts_at, shift.ends_at)}
          </p>
          <p className="font-bold text-gray-900 break-words">{shift.title}</p>
          <div className="flex flex-wrap gap-2 mt-1 text-sm">
            <span className="px-2 py-0.5 rounded-full bg-gray-100">{TASK_LABEL[shift.task_type]}</span>
            <span
              className={`px-2 py-0.5 rounded-full ${
                shift.status === "cancelled" ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"
              }`}
            >
              {SHIFT_STATUS_LABEL[shift.status]}
            </span>
            {shift.status === "scheduled" && (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-800">
                {shift.confirmed_count}/{shift.capacity} confirmados ·{" "}
                {vacanciesLabel(shift.capacity, shift.confirmed_count, shift.waitlist_count)}
              </span>
            )}
            {shift.recurrence_group_id && (
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 inline-flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Semanal
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 mt-1" aria-hidden /> : <ChevronDown className="w-5 h-5 mt-1" aria-hidden />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-5">
          {shift.description && <p className="text-gray-700">{shift.description}</p>}

          {editable && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setEditing((e) => !e)} className="min-h-11 px-4 rounded-lg border border-gray-300 hover:bg-gray-50">
                {editing ? "Fechar edição" : "Editar turno"}
              </button>
              <button type="button" onClick={() => setDialog("cancel")} className="min-h-11 px-4 rounded-lg border border-red-300 text-red-700 hover:bg-red-50">
                Cancelar turno
              </button>
              {/* RN14: turno com inscritos só pode ser cancelado */}
              {!shift.has_any_enrollment && (
                <button type="button" onClick={() => setDialog("delete")} className="min-h-11 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Excluir
                </button>
              )}
            </div>
          )}

          {editing && editable && (
            <div className="rounded-lg border border-gray-200 p-4">
              <ShiftForm
                shelterId={shelterId}
                shiftId={shift.id}
                defaultValues={{
                  title: shift.title,
                  task_type: shift.task_type,
                  description: shift.description ?? "",
                  date: startParts.date,
                  start_time: startParts.time,
                  end_time: endParts.time,
                  capacity: shift.capacity,
                }}
                onDone={() => setEditing(false)}
              />
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {canMark ? "Registrar presença" : "Inscritos"} ({confirmed.length})
            </h3>
            {confirmed.length === 0 ? (
              <p className="text-gray-600 text-sm">Ninguém inscrito.</p>
            ) : canMark ? (
              <ul className="space-y-3">
                {confirmed.map((e) => (
                  <AttendanceRow key={e.id} enrollment={e} shiftStartsAt={shift.starts_at} shiftEndsAt={shift.ends_at} />
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-gray-100">
                {confirmed.map((e) => (
                  <li key={e.id} className="py-2 flex flex-wrap items-center gap-3">
                    <span className="flex-1 font-medium">{e.full_name}</span>
                    <span className={`text-sm px-2 py-0.5 rounded-full border ${ENROLLMENT_BADGE[e.status]}`}>
                      {enrollmentLabel(e.status)}
                    </span>
                    {editable && e.status === "confirmed" && (
                      <button
                        type="button"
                        onClick={() => setDialog({ release: e })}
                        className="min-h-11 px-3 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        Liberar vaga
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!canMark && !future && shift.status !== "cancelled" && (
              <p className="text-sm text-gray-500 mt-2">O prazo para registrar presença (7 dias após o término) terminou.</p>
            )}
          </div>

          {waitlist.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Lista de espera ({waitlist.length}/5)</h3>
              <ol className="divide-y divide-gray-100">
                {waitlist.map((e) => (
                  <li key={e.id} className="py-2 flex flex-wrap items-center gap-3">
                    <span className="w-8 text-gray-500">{e.waitlist_position}º</span>
                    <span className="flex-1 font-medium">{e.full_name}</span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => setDialog({ release: e })}
                        className="min-h-11 px-3 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                      >
                        Remover da fila
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={dialog === "cancel"}
        title="Cancelar turno?"
        tone="danger"
        confirmLabel="Cancelar só este"
        cancelLabel="Voltar"
        pending={pending}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => cancelShiftAction(shift.id, false), "Turno cancelado. Os inscritos foram avisados.")}
        extraActions={
          shift.recurrence_group_id ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelShiftAction(shift.id, true), "Turnos da série cancelados. Os inscritos foram avisados.")}
              className="min-h-11 px-5 rounded-xl border border-red-300 text-red-700 font-semibold hover:bg-red-50"
            >
              Este e os seguintes
            </button>
          ) : null
        }
      >
        <p>
          {shift.title} — {formatDate(shift.starts_at)}, {formatTimeRange(shift.starts_at, shift.ends_at)}.
        </p>
        <p>Todas as pessoas inscritas e na lista de espera recebem um aviso.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "delete"}
        title="Excluir turno?"
        tone="danger"
        confirmLabel="Excluir"
        pending={pending}
        onClose={() => setDialog(null)}
        onConfirm={() => run(() => deleteShiftAction(shift.id), "Turno excluído.")}
      >
        <p>O turno ainda não tem inscritos e será removido da agenda.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={typeof dialog === "object" && dialog !== null}
        title={typeof dialog === "object" && dialog?.release.status === "waitlisted" ? "Remover da lista de espera?" : "Liberar vaga?"}
        tone="danger"
        confirmLabel="Liberar"
        pending={pending}
        onClose={() => setDialog(null)}
        onConfirm={() =>
          typeof dialog === "object" &&
          dialog &&
          run(() => releaseEnrollmentAction(dialog.release.id), "Vaga liberada. A pessoa foi avisada.")
        }
      >
        {typeof dialog === "object" && dialog && (
          <>
            <p>{dialog.release.full_name} deixa de estar inscrito neste turno.</p>
            <p className="text-sm text-gray-600">
              Se faltarem pelo menos 2 horas para o início, a primeira pessoa da lista de espera é confirmada. Com menos
              de 2 horas, a vaga fica aberta na agenda.
            </p>
          </>
        )}
      </ConfirmDialog>
    </li>
  );
}
