import Link from "next/link";
import { CalendarDays, Info, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  agendaRange,
  agendaTitle,
  formatDate,
  isDateString,
  todayLocal,
  type AgendaView,
} from "@/lib/volunteering/time";
import type { ShiftTask } from "@/lib/volunteering/labels";
import { RealtimeRefresh } from "@/components/volunteering/RealtimeRefresh";
import { AgendaToolbar } from "./AgendaToolbar";
import { AgendaList, type AgendaShift } from "./AgendaList";
import { MyShifts, type MyEnrollment } from "./MyShifts";

export const metadata = { title: "Voluntariado — AdotaPet" };

const TASKS: ShiftTask[] = ["walk", "cleaning", "care", "event", "other"];

export default async function VolunteeringPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; shelter?: string; task?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();

  const view: AgendaView = sp.view === "month" ? "month" : "week";
  const date = isDateString(sp.date) ? sp.date : todayLocal();

  const { data: memberships } = await supabase
    .from("shelter_members")
    .select("shelter_id, shelter:shelters(id, name)")
    .eq("user_id", user.id)
    .eq("role", "volunteer");

  const shelters = (memberships ?? []).flatMap((m) => (m.shelter ? [{ id: m.shelter.id, name: m.shelter.name }] : []));

  // CT03_03 / RN06: quem ainda não é voluntário não vê a agenda
  if (shelters.length === 0) {
    const { data: pending } = await supabase
      .from("requests")
      .select("id, shelter:shelters(name)")
      .eq("requester_id", user.id)
      .eq("kind", "volunteer")
      .eq("status", "pending");

    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Agenda de voluntariado</h1>
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-base text-gray-700 space-y-3">
          <div className="flex gap-3">
            <Info className="w-6 h-6 text-blue-600 shrink-0" aria-hidden />
            <p>
              A agenda de turnos fica disponível depois que a sua candidatura ao voluntariado for aprovada por um
              abrigo.
            </p>
          </div>
          {(pending ?? []).length > 0 ? (
            <p>
              Sua candidatura no{" "}
              <strong>{(pending ?? []).map((p) => p.shelter?.name).filter(Boolean).join(", ")}</strong> ainda está em
              análise.
            </p>
          ) : (
            <p>
              Procure um abrigo na página{" "}
              <Link href="/shelters" className="text-blue-700 underline">
                Abrigos
              </Link>{" "}
              e toque em &quot;Quero ser voluntário&quot;.
            </p>
          )}
        </div>
      </div>
    );
  }

  const shelterIds = shelters.map((s) => s.id);
  const selectedShelter = shelterIds.includes(sp.shelter ?? "") ? sp.shelter! : null;
  const selectedTask = TASKS.includes(sp.task as ShiftTask) ? (sp.task as ShiftTask) : null;

  const nowIso = new Date().toISOString();
  const range = agendaRange(view, date);
  const fromIso = range.from > nowIso ? range.from : nowIso;

  let shiftsQuery = supabase
    .from("volunteer_shifts")
    .select(
      "id, shelter_id, title, task_type, description, starts_at, ends_at, capacity, confirmed_count, waitlist_count, status",
    )
    .in("shelter_id", selectedShelter ? [selectedShelter] : shelterIds)
    .eq("status", "scheduled")
    .gte("starts_at", fromIso)
    .lt("starts_at", range.to)
    .order("starts_at");
  if (selectedTask) shiftsQuery = shiftsQuery.eq("task_type", selectedTask);

  const [{ data: shifts }, { data: enrollments }, { data: blocks }] = await Promise.all([
    shiftsQuery,
    supabase
      .from("shift_enrollments")
      .select(
        "id, shift_id, status, waitlist_position, shift:volunteer_shifts(id, title, task_type, starts_at, ends_at, shelter_id, status)",
      )
      .eq("user_id", user.id)
      .in("status", ["confirmed", "waitlisted"]),
    supabase
      .from("volunteer_blocks")
      .select("id, shelter_id, blocked_until")
      .eq("user_id", user.id)
      .is("lifted_at", null)
      .gt("blocked_until", nowIso),
  ]);

  const shelterName = new Map(shelters.map((s) => [s.id, s.name]));
  const myByShift = new Map((enrollments ?? []).map((e) => [e.shift_id, e]));

  const agenda: AgendaShift[] = (shifts ?? []).map((s) => {
    const mine = myByShift.get(s.id);
    return {
      ...s,
      shelter_name: shelterName.get(s.shelter_id) ?? "Abrigo",
      my_status: mine?.status ?? null,
      my_waitlist_position: mine?.waitlist_position ?? null,
      blocked_until: (blocks ?? []).find((b) => b.shelter_id === s.shelter_id)?.blocked_until ?? null,
    };
  });

  const mine: MyEnrollment[] = (enrollments ?? [])
    .flatMap((e) =>
      e.shift && e.shift.ends_at > nowIso && e.shift.status === "scheduled"
        ? [
            {
              id: e.id,
              status: e.status,
              waitlist_position: e.waitlist_position,
              shift_id: e.shift.id,
              title: e.shift.title,
              task_type: e.shift.task_type,
              starts_at: e.shift.starts_at,
              ends_at: e.shift.ends_at,
              shelter_name: shelterName.get(e.shift.shelter_id) ?? "Abrigo",
            },
          ]
        : [],
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-base">
      <RealtimeRefresh channel="agenda" shelterIds={shelterIds} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDays className="w-8 h-8 text-blue-600" aria-hidden />
          Agenda de voluntariado
        </h1>
        <p className="text-gray-600 mt-1">Escolha um turno e toque em &quot;Quero participar&quot;.</p>
      </div>

      {(blocks ?? []).map((b) => (
        <div key={b.id} className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          <Lock className="w-5 h-5 mt-0.5 shrink-0" aria-hidden />
          <p>
            Suas novas inscrições no <strong>{shelterName.get(b.shelter_id)}</strong> estão bloqueadas até{" "}
            <strong>{formatDate(b.blocked_until)}</strong>, por três faltas seguidas sem justificativa. As inscrições que
            você já tinha continuam valendo.
          </p>
        </div>
      ))}

      <MyShifts enrollments={mine} nowIso={nowIso} />

      <section aria-labelledby="agenda-title" className="mt-8">
        <h2 id="agenda-title" className="sr-only">
          Turnos disponíveis
        </h2>
        <AgendaToolbar
          view={view}
          date={date}
          title={agendaTitle(view, date)}
          shelters={shelters}
          shelter={selectedShelter}
          task={selectedTask}
        />
        <AgendaList shifts={agenda} />
      </section>
    </div>
  );
}
