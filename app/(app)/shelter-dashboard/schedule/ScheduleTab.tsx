import { createClient } from "@/lib/supabase/server";
import { RealtimeRefresh } from "@/components/volunteering/RealtimeRefresh";
import { ScheduleIndicators, type Indicators } from "./ScheduleIndicators";
import { ShiftForm } from "./ShiftForm";
import { ShiftList, type ManagedShift } from "./ShiftList";
import { BlockedVolunteers, type BlockRow } from "./BlockedVolunteers";

/**
 * Aba Escala do painel (UC01, UC02, UC08, UC13, UC14). Só é renderizada para
 * administradores e editores; o banco confere o papel em todas as ações.
 */
export async function ScheduleTab({ shelterId }: { shelterId: string }) {
  const supabase = await createClient();
  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: indicators }, { data: shifts }, { data: blocks }] = await Promise.all([
    supabase.rpc("shelter_schedule_indicators", { p_shelter_id: shelterId }),
    supabase
      .from("volunteer_shifts")
      .select(
        "id, title, task_type, description, starts_at, ends_at, capacity, confirmed_count, waitlist_count, status, recurrence_group_id, shift_enrollments(id, user_id, status, waitlist_position, enrolled_at, checked_in_at, checked_out_at, worked_minutes, attendance_marked_at)",
      )
      .eq("shelter_id", shelterId)
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at"),
    supabase
      .from("volunteer_blocks")
      .select("id, user_id, reason, blocked_until, created_at")
      .eq("shelter_id", shelterId)
      .is("lifted_at", null)
      .gt("blocked_until", now.toISOString())
      .order("blocked_until"),
  ]);

  const userIds = new Set<string>();
  (shifts ?? []).forEach((s) => s.shift_enrollments.forEach((e) => userIds.add(e.user_id)));
  (blocks ?? []).forEach((b) => userIds.add(b.user_id));
  const { data: profiles } = userIds.size
    ? await supabase.from("profiles").select("id, full_name").in("id", [...userIds])
    : { data: [] as { id: string; full_name: string }[] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const managed: ManagedShift[] = (shifts ?? []).map(({ shift_enrollments, ...s }) => ({
    ...s,
    enrollments: shift_enrollments
      .filter((e) => e.status !== "cancelled")
      .map((e) => ({ ...e, full_name: names.get(e.user_id) ?? "Voluntário" }))
      .sort((a, b) => (a.waitlist_position ?? 0) - (b.waitlist_position ?? 0) || a.enrolled_at.localeCompare(b.enrolled_at)),
    has_any_enrollment: shift_enrollments.length > 0,
  }));

  const blockRows: BlockRow[] = (blocks ?? []).map((b) => ({ ...b, full_name: names.get(b.user_id) ?? "Voluntário" }));

  return (
    <div className="space-y-8">
      <RealtimeRefresh channel="escala" shelterIds={[shelterId]} />
      <ScheduleIndicators data={(indicators ?? null) as Indicators | null} />

      <section className="border border-gray-200 rounded-xl p-5">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Novo turno</h2>
        <ShiftForm shelterId={shelterId} />
      </section>

      <ShiftList shelterId={shelterId} shifts={managed} nowIso={now.toISOString()} />

      <BlockedVolunteers blocks={blockRows} />
    </div>
  );
}
