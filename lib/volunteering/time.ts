import { TZDate, tz } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/** RNF13: tudo é exibido no horário de Brasília, independente do aparelho. */
export const APP_TZ = "America/Sao_Paulo";
const inTz = tz(APP_TZ);

export type AgendaView = "week" | "month";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateString(value: string | undefined | null): value is string {
  return !!value && DATE_RE.test(value);
}

/** Data (YYYY-MM-DD) + hora (HH:mm) digitadas no horário de Brasília → instante UTC (ISO). */
export function localToUtcIso(date: string, time: string): string {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
    throw new Error("Data ou horário inválido");
  }
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return utcIso(new TZDate(y, m - 1, d, h, mi, APP_TZ));
}

/** Instante (ISO/Date) → { date: YYYY-MM-DD, time: HH:mm } em Brasília (para preencher formulários). */
export function utcToLocalParts(value: string | Date): { date: string; time: string } {
  const d = new Date(value);
  return {
    date: format(d, "yyyy-MM-dd", { in: inTz }),
    time: format(d, "HH:mm", { in: inTz }),
  };
}

export function todayLocal(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd", { in: inTz });
}

export function formatTime(value: string | Date): string {
  return format(new Date(value), "HH'h'mm", { in: inTz });
}

export function formatDate(value: string | Date): string {
  return format(new Date(value), "dd/MM/yyyy", { in: inTz });
}

export function formatDateTime(value: string | Date): string {
  return format(new Date(value), "dd/MM/yyyy 'às' HH'h'mm", { in: inTz });
}

/** "sábado, 21 de novembro" */
export function formatDayLabel(value: string | Date): string {
  return format(new Date(value), "EEEE, d 'de' MMMM", { in: inTz, locale: ptBR });
}

export function formatTimeRange(start: string | Date, end: string | Date): string {
  return `${formatTime(start)} às ${formatTime(end)}`;
}

/** Chave do dia (YYYY-MM-DD) em Brasília, usada para agrupar a agenda. */
export function dayKey(value: string | Date): string {
  return format(new Date(value), "yyyy-MM-dd", { in: inTz });
}

/** 645 → "10h45"; 180 → "3h"; 0 → "0h" */
export function minutesToLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Sempre em UTC com "Z" (TZDate.toISOString() devolveria o offset -03:00). */
function utcIso(d: Date): string {
  return new Date(d.getTime()).toISOString();
}

function anchor(date: string): TZDate {
  const [y, m, d] = date.split("-").map(Number);
  return new TZDate(y, m - 1, d, 12, 0, APP_TZ);
}

/** Intervalo [from, to) da semana (segunda a domingo) ou do mês que contém a data, em UTC. */
export function agendaRange(view: AgendaView, date: string): { from: string; to: string } {
  const a = anchor(date);
  if (view === "week") {
    const start = startOfWeek(a, { weekStartsOn: 1 });
    const end = addDays(endOfWeek(a, { weekStartsOn: 1 }), 0);
    return {
      from: utcIso(new TZDate(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, APP_TZ)),
      to: utcIso(new TZDate(end.getFullYear(), end.getMonth(), end.getDate() + 1, 0, 0, APP_TZ)),
    };
  }
  const start = startOfMonth(a);
  const end = endOfMonth(a);
  return {
    from: utcIso(new TZDate(start.getFullYear(), start.getMonth(), 1, 0, 0, APP_TZ)),
    to: utcIso(new TZDate(end.getFullYear(), end.getMonth(), end.getDate() + 1, 0, 0, APP_TZ)),
  };
}

export function moveAgenda(view: AgendaView, date: string, direction: 1 | -1): string {
  const a = anchor(date);
  const moved = view === "week" ? addWeeks(a, direction) : addMonths(a, direction);
  return format(moved, "yyyy-MM-dd", { in: inTz });
}

export function agendaTitle(view: AgendaView, date: string): string {
  const { from, to } = agendaRange(view, date);
  if (view === "month") {
    const label = format(new Date(from), "MMMM 'de' yyyy", { in: inTz, locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
  const last = new Date(new Date(to).getTime() - 1);
  return `${format(new Date(from), "dd/MM", { in: inTz })} a ${format(last, "dd/MM/yyyy", { in: inTz })}`;
}

/** Faltam pelo menos 12 horas? (só para exibir o botão; quem decide é o banco — RN09) */
export function canSelfCancel(startsAt: string, now: Date = new Date()): boolean {
  return new Date(startsAt).getTime() - now.getTime() >= 12 * 60 * 60 * 1000;
}

/** RN15: janela de registro de presença. */
export function attendanceWindowOpen(startsAt: string, endsAt: string, now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= new Date(startsAt).getTime() && t <= new Date(endsAt).getTime() + 7 * 24 * 60 * 60 * 1000;
}
