"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ENROLLMENT_BADGE, enrollmentLabel } from "@/lib/volunteering/labels";
import { minutesToLabel, utcToLocalParts, formatDateTime } from "@/lib/volunteering/time";
import { markAttendanceAction } from "../schedule-actions";
import type { ManagedEnrollment } from "./ShiftList";

type Mark = "attended" | "absent" | "excused";

const OPTIONS: { value: Mark; label: string }[] = [
  { value: "attended", label: "Presente" },
  { value: "absent", label: "Falta" },
  { value: "excused", label: "Falta justificada" },
];

/** UC08 — presença, falta ou falta justificada, com horário real de entrada e saída. */
export function AttendanceRow({
  enrollment,
  shiftStartsAt,
}: {
  enrollment: ManagedEnrollment;
  shiftStartsAt: string;
  shiftEndsAt: string;
}) {
  const initial: Mark | "" = enrollment.status === "confirmed" ? "" : (enrollment.status as Mark);
  const [status, setStatus] = useState<Mark | "">(initial);
  const [checkIn, setCheckIn] = useState(enrollment.checked_in_at ? utcToLocalParts(enrollment.checked_in_at).time : "");
  const [checkOut, setCheckOut] = useState(enrollment.checked_out_at ? utcToLocalParts(enrollment.checked_out_at).time : "");
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (!status) return void toast.error("Escolha presente, falta ou falta justificada.");
    startTransition(async () => {
      const r = await markAttendanceAction({
        enrollment_id: enrollment.id,
        status,
        check_in: status === "attended" ? checkIn : "",
        check_out: status === "attended" ? checkOut : "",
        shift_starts_at: shiftStartsAt,
      });
      if (r.error) toast.error(r.error, { duration: 8000 });
      else
        toast.success(
          status === "attended"
            ? `Presença de ${enrollment.full_name} registrada: ${minutesToLabel(r.worked_minutes ?? 0)}.`
            : `${OPTIONS.find((o) => o.value === status)?.label} registrada para ${enrollment.full_name}.`,
        );
    });
  };

  return (
    <li className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="font-semibold text-gray-900 flex-1">{enrollment.full_name}</span>
        <span className={`text-sm px-2 py-0.5 rounded-full border ${ENROLLMENT_BADGE[enrollment.status]}`}>
          {enrollment.status === "confirmed" ? "Sem registro" : enrollmentLabel(enrollment.status)}
          {enrollment.status === "attended" ? ` · ${minutesToLabel(enrollment.worked_minutes)}` : ""}
        </span>
      </div>
      <fieldset className="flex flex-wrap gap-2 mb-2">
        <legend className="sr-only">Situação de {enrollment.full_name}</legend>
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`min-h-11 px-3 inline-flex items-center gap-2 rounded-lg border cursor-pointer text-sm ${
              status === o.value ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-300"
            }`}
          >
            <input
              type="radio"
              name={`att-${enrollment.id}`}
              value={o.value}
              checked={status === o.value}
              onChange={() => setStatus(o.value)}
            />
            {o.label}
          </label>
        ))}
      </fieldset>
      {status === "attended" && (
        <div className="flex flex-wrap items-end gap-3 mb-2">
          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Entrada</span>
            <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="min-h-11 rounded-lg border border-gray-300 px-2" />
          </label>
          <label className="text-sm">
            <span className="block text-gray-700 mb-1">Saída</span>
            <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="min-h-11 rounded-lg border border-gray-300 px-2" />
          </label>
          <p className="text-xs text-gray-500 basis-full">Sem horários, vale a duração prevista do turno.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="min-h-11 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : enrollment.attendance_marked_at ? "Corrigir registro" : "Salvar"}
        </button>
        {enrollment.attendance_marked_at && (
          <span className="text-xs text-gray-500">Registrado em {formatDateTime(enrollment.attendance_marked_at)}</span>
        )}
      </div>
    </li>
  );
}
