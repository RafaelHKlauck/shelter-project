import { CalendarX, Percent, UserCheck } from "lucide-react";
import { formatDate, formatTimeRange } from "@/lib/volunteering/time";

export type Indicators = {
  capacity_next_7_days: number;
  confirmed_next_7_days: number;
  occupancy_rate: number | null;
  attended_last_30_days: number;
  closed_last_30_days: number;
  attendance_rate: number | null;
  uncovered_shifts: { id: string; title: string; starts_at: string; ends_at: string; capacity: number }[];
};

/** UC14 — RF41 */
export function ScheduleIndicators({ data }: { data: Indicators | null }) {
  if (!data) return null;
  return (
    <section aria-labelledby="ind-title">
      <h2 id="ind-title" className="text-xl font-bold text-gray-900 mb-3">Indicadores da escala</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card
          icon={Percent}
          label="Ocupação dos turnos (próximos 7 dias)"
          value={data.occupancy_rate == null ? "—" : `${data.occupancy_rate}%`}
          hint={`${data.confirmed_next_7_days} confirmados em ${data.capacity_next_7_days} vagas`}
        />
        <Card
          icon={UserCheck}
          label="Taxa de presença (últimos 30 dias)"
          value={data.attendance_rate == null ? "—" : `${data.attendance_rate}%`}
          hint={`${data.attended_last_30_days} presenças em ${data.closed_last_30_days} inscrições encerradas`}
        />
        <Card
          icon={CalendarX}
          label="Turnos sem inscritos (próximos 7 dias)"
          value={String(data.uncovered_shifts.length)}
          hint={data.uncovered_shifts.length ? "Veja a lista abaixo" : "Todos os turnos têm alguém"}
        />
      </div>
      {data.uncovered_shifts.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900 mb-2">Turnos descobertos</p>
          <ul className="space-y-1 text-amber-900">
            {data.uncovered_shifts.map((s) => (
              <li key={s.id}>
                {formatDate(s.starts_at)}, {formatTimeRange(s.starts_at, s.ends_at)} — {s.title} ({s.capacity} vagas)
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{hint}</p>
    </div>
  );
}
