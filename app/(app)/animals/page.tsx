import { createClient } from "@/lib/supabase/server";
import { getUser, getProfile } from "@/lib/auth/server";
import { AnimalCard, type AnimalCardData } from "@/components/animals/AnimalCard";
import { LocationWarning } from "@/components/ui/LocationWarning";
import { AnimalsFilters } from "./AnimalsFilters";

export default async function AnimalsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    species?: string;
    size?: string;
    maxKm?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  const hasLocation = Boolean(profile?.location);

  const { data: rows, error } = await supabase.rpc("animals_feed", {
    p_species: sp.species || undefined,
    p_size: sp.size || undefined,
    p_max_km:
      sp.maxKm && hasLocation ? Number(sp.maxKm) : undefined,
    p_search: sp.q || undefined,
  });

  const animals: AnimalCardData[] =
    rows?.map((r) => ({
      id: r.id,
      name: r.name,
      species: r.species,
      breed: r.breed,
      size: r.size,
      estimated_age_months: r.estimated_age_months,
      neutered: r.neutered,
      cover_url: r.cover_url,
      shelter_name: r.shelter_name,
      distance_km: r.distance_km,
    })) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Animais para Adoção
        </h1>
        <p className="text-gray-600">Encontre seu novo companheiro</p>
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

      <AnimalsFilters hasLocation={hasLocation} />

      {error && (
        <p className="text-sm text-red-600 mb-4">
          Erro ao buscar animais: {error.message}
        </p>
      )}

      <div className="mb-4 text-gray-600">
        {animals.length}{" "}
        {animals.length === 1 ? "animal encontrado" : "animais encontrados"}
      </div>

      {animals.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {animals.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Nenhum animal encontrado com esses filtros.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Tente ajustar os filtros de busca.
          </p>
        </div>
      )}
    </div>
  );
}
