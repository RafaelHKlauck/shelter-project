import type { Database } from "@/lib/supabase/types";

export type ShiftTask = Database["public"]["Enums"]["shift_task"];
export type ShiftStatus = Database["public"]["Enums"]["shift_status"];
export type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];

export const TASK_OPTIONS: { value: ShiftTask; label: string }[] = [
  { value: "walk", label: "Passeio" },
  { value: "cleaning", label: "Limpeza" },
  { value: "care", label: "Cuidados" },
  { value: "event", label: "Evento" },
  { value: "other", label: "Outra" },
];

export const TASK_LABEL: Record<ShiftTask, string> = Object.fromEntries(
  TASK_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ShiftTask, string>;

export const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = {
  scheduled: "Agendado",
  cancelled: "Cancelado",
  completed: "Concluído",
};

/** RNF10: a situação sempre aparece escrita, não só por cor. */
export function enrollmentLabel(status: EnrollmentStatus, waitlistPosition?: number | null): string {
  switch (status) {
    case "confirmed":
      return "Inscrito";
    case "waitlisted":
      return waitlistPosition ? `Na lista de espera (posição ${waitlistPosition})` : "Na lista de espera";
    case "cancelled":
      return "Cancelado";
    case "attended":
      return "Presente";
    case "absent":
      return "Falta";
    case "excused":
      return "Falta justificada";
  }
}

export const ENROLLMENT_BADGE: Record<EnrollmentStatus, string> = {
  confirmed: "bg-green-50 text-green-800 border-green-200",
  waitlisted: "bg-amber-50 text-amber-800 border-amber-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  attended: "bg-blue-50 text-blue-800 border-blue-200",
  absent: "bg-red-50 text-red-800 border-red-200",
  excused: "bg-purple-50 text-purple-800 border-purple-200",
};

export function vacanciesLabel(capacity: number, confirmed: number, waitlist: number): string {
  const left = capacity - confirmed;
  if (left > 0) return left === 1 ? "1 vaga restante" : `${left} vagas restantes`;
  if (waitlist >= 5) return "Lotado e lista de espera completa";
  return `Lotado · lista de espera ${waitlist}/5`;
}
