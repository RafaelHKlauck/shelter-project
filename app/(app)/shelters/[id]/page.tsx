import { notFound } from "next/navigation";
import { MapPin, Phone, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/server";
import { AnimalCard, type AnimalCardData } from "@/components/animals/AnimalCard";
import { ShelterActions } from "./ShelterActions";

const FALLBACK = "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=1600";

export default async function ShelterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();

  const [{ data: shelter }, { data: supplies }, { data: animals }] = await Promise.all([
    supabase.from("shelters").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("supply_needs")
      .select("id, title, status")
      .eq("shelter_id", id)
      .neq("status", "cancelled"),
    supabase
      .from("animals")
      .select("id, name, species, breed, size, estimated_age_months, neutered, cover_url")
      .eq("shelter_id", id)
      .eq("status", "available")
      .order("created_at", { ascending: false }),
  ]);

  if (!shelter) notFound();

  const openSupplies = (supplies ?? []).filter((s) => s.status === "open" || s.status === "in_progress");

  const animalCards: AnimalCardData[] =
    animals?.map((a) => ({
      id: a.id,
      name: a.name,
      species: a.species,
      breed: a.breed,
      size: a.size,
      estimated_age_months: a.estimated_age_months,
      neutered: a.neutered,
      cover_url: a.cover_url,
      shelter_name: shelter.name,
    })) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="relative aspect-[21/9] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shelter.cover_url ?? FALLBACK}
            alt={shelter.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{shelter.name}</h1>

          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-5 h-5" />
              <span>
                {shelter.address_line}, {shelter.address_city} - {shelter.address_state}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-5 h-5" />
              <span>{shelter.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <PawPrint className="w-5 h-5" />
              <span>{animalCards.length} animais disponíveis</span>
            </div>
          </div>

          {shelter.description && (
            <p className="text-gray-600 mb-6">{shelter.description}</p>
          )}

          <ShelterActions
            shelterId={shelter.id}
            shelterName={shelter.name}
            isAuthenticated={Boolean(user)}
            needsSupplies={shelter.needs_supplies}
            supplies={openSupplies}
          />
        </div>
      </div>

      {shelter.needs_supplies && openSupplies.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-orange-900 mb-4">
            Suprimentos Necessários
          </h2>
          <div className="flex flex-wrap gap-2">
            {openSupplies.map((supply) => (
              <span
                key={supply.id}
                className="px-3 py-2 bg-white border border-orange-300 text-orange-900 rounded-lg"
              >
                {supply.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Animais Disponíveis para Adoção
        </h2>

        {animalCards.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {animalCards.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum animal disponível no momento.</p>
        )}
      </div>
    </div>
  );
}
