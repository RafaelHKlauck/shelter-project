import { createClient } from "@/lib/supabase/server";
import { getProfile, getUser } from "@/lib/auth/server";
import {
  ShelterCard,
  type ShelterCardData,
} from "@/components/shelters/ShelterCard";
import { LocationWarning } from "@/components/ui/LocationWarning";
import { SheltersFilters } from "./SheltersFilters";

export default async function SheltersListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; maxKm?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  const hasLocation = Boolean(profile?.location);

  const { data: rows, error } = await supabase.rpc("shelters_feed", {
    p_search: sp.q || undefined,
    p_max_km: sp.maxKm && hasLocation ? Number(sp.maxKm) : undefined,
  });

  const shelters: ShelterCardData[] =
    rows?.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      cover_url: r.cover_url,
      needs_supplies: r.needs_supplies,
      animals_count: Number(r.animals_count ?? 0),
      distance_km: r.distance_km,
    })) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Abrigos</h1>
        <p className="text-gray-600">
          Conheça os abrigos parceiros e ajude como voluntário ou com doações
        </p>
      </div>

      {!user && (
        <LocationWarning
          message="Você não está logado. Crie uma conta para filtrar por distância em relação ao seu endereço."
          actionHref="/signup"
          actionLabel="Criar conta"
        />
      )}

      {user && !hasLocation && (
        <LocationWarning
          message="Seu perfil ainda não tem endereço geolocalizado. O filtro por distância fica desabilitado até você completar o cadastro."
          actionHref="/onboarding/profile"
          actionLabel="Completar perfil"
        />
      )}

      <SheltersFilters hasLocation={hasLocation} />

      {error && (
        <p className="text-sm text-red-600 mb-4">
          Erro ao buscar abrigos: {error.message}
        </p>
      )}

      <div className="mb-4 text-gray-600">
        {shelters.length}{" "}
        {shelters.length === 1 ? "abrigo encontrado" : "abrigos encontrados"}
      </div>

      {shelters.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shelters.map((shelter) => (
            <ShelterCard key={shelter.id} shelter={shelter} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Nenhum abrigo encontrado com esses filtros.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Tente ajustar a distância ou termo de busca.
          </p>
        </div>
      )}
    </div>
  );
}
