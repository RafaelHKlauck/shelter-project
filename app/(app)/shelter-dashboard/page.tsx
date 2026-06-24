import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { LocationWarning } from "@/components/ui/LocationWarning";
import { ShelterSwitcher } from "./ShelterSwitcher";
import { KpiCards } from "./KpiCards";
import { DashboardTabs } from "./DashboardTabs";
import { RequestsTab, type RequestRow } from "./RequestsTab";
import { AnimalsTab } from "./AnimalsTab";
import { InfoForm } from "./InfoForm";
import { SuppliesEditor } from "./SuppliesEditor";
import { TeamTab, type Member } from "./TeamTab";

export default async function ShelterDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ shelter?: string }>;
}) {
  const user = await requireUser();
  const { shelter: querySelected } = await searchParams;
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("shelter_members")
    .select("role, shelter:shelters(id, name)")
    .eq("user_id", user.id);

  const list = (memberships ?? []).flatMap((m) =>
    m.shelter ? [{ id: m.shelter.id, name: m.shelter.name, role: m.role }] : [],
  );

  if (list.length === 0) {
    redirect("/onboarding/shelter");
  }

  const selected =
    list.find((s) => s.id === querySelected) ?? list[0];

  const [
    { data: shelter },
    { data: animals },
    { data: pending },
    { data: approved },
    { data: supplies },
  ] = await Promise.all([
    supabase
      .from("shelters")
      .select("*")
      .eq("id", selected.id)
      .maybeSingle(),
    supabase
      .from("animals")
      .select("id, name, species, breed, size, estimated_age_months, status, cover_url")
      .eq("shelter_id", selected.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("requests")
      .select(
        "id, kind, status, created_at, requester_id, message, animal:animals(id, name), supply_need:supply_needs(id, title)",
      )
      .eq("shelter_id", selected.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("requests")
      .select(
        "id, kind, status, created_at, requester_id, message, animal:animals(id, name), supply_need:supply_needs(id, title)",
      )
      .eq("shelter_id", selected.id)
      .eq("status", "accepted")
      .order("decided_at", { ascending: false }),
    supabase
      .from("supply_needs")
      .select("id, title, quantity_target, quantity_fulfilled, unit, status")
      .eq("shelter_id", selected.id)
      .order("created_at"),
  ]);

  if (!shelter) redirect("/onboarding/shelter");

  const requesterIds = Array.from(
    new Set([
      ...(pending ?? []).map((p) => p.requester_id),
      ...(approved ?? []).map((p) => p.requester_id),
    ]),
  );

  const requestersById = new Map<
    string,
    {
      id: string;
      full_name: string;
      cpf_encrypted: string | null;
      birth_date: string;
      address_line: string;
      address_city: string;
      address_state: string;
      housing_type: "house" | "apartment";
      avatar_url: string | null;
    }
  >();

  if (requesterIds.length > 0) {
    const { data: requesters } = await supabase
      .from("profiles")
      .select(
        "id, full_name, cpf_encrypted, birth_date, address_line, address_city, address_state, housing_type, avatar_url",
      )
      .in("id", requesterIds);
    (requesters ?? []).forEach((r) => requestersById.set(r.id, r));
  }

  const toRow = (p: {
    id: string;
    kind: string;
    status: string;
    created_at: string;
    requester_id: string;
    message: string | null;
    animal: { id: string; name: string | null } | null;
    supply_need: { id: string; title: string } | null;
  }): RequestRow => ({
    id: p.id,
    kind: p.kind as RequestRow["kind"],
    status: p.status as RequestRow["status"],
    created_at: p.created_at,
    requester_id: p.requester_id,
    message: p.message,
    animal_name: p.animal?.name ?? null,
    supply_title: p.supply_need?.title ?? null,
    requester: requestersById.get(p.requester_id) ?? null,
  });

  const pendingRows: RequestRow[] = (pending ?? []).map(toRow);
  const approvedRows: RequestRow[] = (approved ?? []).map(toRow);

  const { data: teamRows } = await supabase
    .from("shelter_members")
    .select("user_id, role")
    .eq("shelter_id", shelter.id);

  const teamUserIds = (teamRows ?? []).map((r) => r.user_id);
  const { data: teamProfiles } = teamUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", teamUserIds)
    : { data: [] as { id: string; full_name: string; avatar_url: string | null }[] };

  const teamProfilesMap = new Map(
    (teamProfiles ?? []).map((p) => [p.id, p]),
  );

  const isAdmin = (teamRows ?? []).some(
    (m) => m.user_id === user.id && m.role === "admin",
  );

  const members: Member[] = (teamRows ?? []).map((m) => {
    const p = teamProfilesMap.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      full_name: p?.full_name ?? "Membro",
      avatar_url: p?.avatar_url ?? null,
      is_me: m.user_id === user.id,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Painel do Abrigo: {shelter.name}
          </h1>
          <p className="text-gray-600">
            Gerencie solicitações, animais e informações do abrigo
          </p>
        </div>
        <ShelterSwitcher current={selected.id} shelters={list} />
      </div>

      {!shelter.location && (
        <LocationWarning
          message="Não conseguimos localizar o endereço deste abrigo no mapa. A busca por distância pode ficar imprecisa até você revisar o endereço."
          actionHref={`/shelter-dashboard?shelter=${shelter.id}#tab-info`}
          actionLabel="Revisar endereço na aba Informações"
        />
      )}

      <KpiCards
        animals={animals?.length ?? 0}
        pending={pendingRows.length}
        approved={approvedRows.length}
      />

      <DashboardTabs
        requests={
          <RequestsTab
            shelterId={shelter.id}
            pending={pendingRows}
            approved={approvedRows}
          />
        }
        animals={<AnimalsTab animals={animals ?? []} />}
        team={
          <TeamTab
            shelterId={shelter.id}
            isAdmin={isAdmin}
            members={members}
          />
        }
        info={
          <div className="space-y-8">
            <InfoForm
              defaultValues={{
                id: shelter.id,
                name: shelter.name,
                phone: shelter.phone,
                email: shelter.email ?? "",
                description: shelter.description ?? "",
                needs_supplies: shelter.needs_supplies,
                cover_url: shelter.cover_url ?? "",
                address_line: shelter.address_line,
                address_city: shelter.address_city,
                address_state: shelter.address_state,
                address_zip: shelter.address_zip,
              }}
            />
            <SuppliesEditor shelterId={shelter.id} supplies={supplies ?? []} />
          </div>
        }
      />
    </div>
  );
}
