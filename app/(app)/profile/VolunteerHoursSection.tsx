import Link from "next/link";
import { Clock, FileText, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ENROLLMENT_BADGE, TASK_LABEL, enrollmentLabel } from "@/lib/volunteering/labels";
import { formatDate, formatTimeRange, isDateString, localToUtcIso, minutesToLabel } from "@/lib/volunteering/time";
import { HoursFilter } from "./HoursFilter";
import { CertificateForm } from "./CertificateForm";

function br(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** UC09 (RF36) e UC10 (RF37): horas por abrigo, histórico e certificados. */
export async function VolunteerHoursSection({
  userId,
  shelters,
  from,
  to,
}: {
  userId: string;
  shelters: { id: string; name: string }[];
  from?: string;
  to?: string;
}) {
  const supabase = await createClient();
  const pFrom = isDateString(from) ? from : undefined;
  const pTo = isDateString(to) ? to : undefined;

  let historyQuery = supabase
    .from("shift_enrollments")
    .select("id, status, worked_minutes, checked_in_at, checked_out_at, shift:volunteer_shifts!inner(id, title, task_type, starts_at, ends_at, shelter:shelters(name))")
    .eq("user_id", userId)
    .in("status", ["attended", "absent", "excused"])
    .order("starts_at", { referencedTable: "volunteer_shifts", ascending: false })
    .limit(100);
  if (pFrom) historyQuery = historyQuery.gte("volunteer_shifts.starts_at", localToUtcIso(pFrom, "00:00"));
  if (pTo) historyQuery = historyQuery.lte("volunteer_shifts.starts_at", localToUtcIso(pTo, "23:59"));

  const [{ data: summary }, { data: history }, { data: certificates }] = await Promise.all([
    supabase.rpc("volunteer_hours_summary", { ...(pFrom ? { p_from: pFrom } : {}), ...(pTo ? { p_to: pTo } : {}) }),
    historyQuery,
    supabase
      .from("volunteer_certificates")
      .select("id, code, shelter_name, period_start, period_end, total_minutes, issued_at")
      .order("issued_at", { ascending: false })
      .limit(20),
  ]);

  const rows = (history ?? [])
    .filter((h) => h.shift)
    .sort((a, b) => b.shift!.starts_at.localeCompare(a.shift!.starts_at));
  const total = (summary ?? []).reduce((acc, s) => acc + Number(s.total_minutes), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" aria-hidden />
          Horas de voluntariado
        </h2>
        <p className="text-lg font-semibold text-gray-900">Total: {minutesToLabel(total)}</p>
      </div>

      <HoursFilter from={pFrom ?? ""} to={pTo ?? ""} />

      {(summary ?? []).length === 0 ? (
        <p className="text-gray-600">Nenhuma presença registrada {pFrom || pTo ? "neste período" : "ainda"}.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3">
          {(summary ?? []).map((s) => (
            <li key={s.shelter_id} className="rounded-lg border border-gray-200 p-4">
              <p className="text-gray-600">{s.shelter_name}</p>
              <p className="text-2xl font-bold text-gray-900">{minutesToLabel(Number(s.total_minutes))}</p>
              <p className="text-sm text-gray-500">
                {s.shifts_count} {Number(s.shifts_count) === 1 ? "turno realizado" : "turnos realizados"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Histórico de turnos</h3>
        {rows.length === 0 ? (
          <p className="text-gray-600 text-sm">Sem turnos encerrados com presença registrada.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((h) => (
              <li key={h.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm text-gray-600 w-24">{formatDate(h.shift!.starts_at)}</span>
                <span className="flex-1 min-w-40">
                  <span className="font-medium text-gray-900">{h.shift!.title}</span>
                  <span className="text-sm text-gray-600">
                    {" "}
                    · {TASK_LABEL[h.shift!.task_type]} · {h.shift!.shelter?.name} ·{" "}
                    {formatTimeRange(h.shift!.starts_at, h.shift!.ends_at)}
                  </span>
                </span>
                <span className={`text-sm px-2 py-0.5 rounded-full border ${ENROLLMENT_BADGE[h.status]}`}>
                  {enrollmentLabel(h.status)}
                </span>
                <span className="text-sm font-semibold w-14 text-right">{minutesToLabel(h.worked_minutes)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" aria-hidden />
          Certificado de horas
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          O PDF traz o seu nome, o CPF mascarado, o abrigo, o período, o total de horas e um código que qualquer pessoa
          pode conferir em{" "}
          <Link href="/certificates" className="text-blue-700 underline">
            /certificates
          </Link>
          .
        </p>
        <CertificateForm shelters={shelters} />

        {(certificates ?? []).length > 0 && (
          <ul className="mt-5 divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {(certificates ?? []).map((c) => (
              <li key={c.id} className="p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-48">
                  <p className="font-medium text-gray-900">
                    {c.shelter_name} · {minutesToLabel(c.total_minutes)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {br(c.period_start)} a {br(c.period_end)} · código <span className="font-mono">{c.code}</span>
                  </p>
                </div>
                <a
                  href={`/api/certificates/${c.code}/download`}
                  target="_blank"
                  rel="noopener"
                  className="min-h-11 inline-flex items-center px-3 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                >
                  Baixar PDF
                </a>
                <Link
                  href={`/certificates/${c.code}`}
                  className="min-h-11 inline-flex items-center gap-1 px-3 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
                >
                  <ShieldCheck className="w-4 h-4" aria-hidden /> Validação
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
