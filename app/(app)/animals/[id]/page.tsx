import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Heart, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/server";
import {
  SIZE_LABEL,
  SPECIES_LABEL,
  ageLabelMonths,
} from "@/lib/format/animals";
import { AdoptionRequestDialog } from "./AdoptionRequestDialog";

const FALLBACK = "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=1200";

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();

  const { data: animal } = await supabase
    .from("animals")
    .select("*, shelter:shelters(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (!animal || !animal.shelter) notFound();

  const breed = animal.breed?.trim() || "Sem raça definida";
  const temperament = (animal.temperament ?? []).join(", ") || "—";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <div className="relative aspect-square rounded-xl overflow-hidden mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={animal.cover_url ?? FALLBACK}
              alt={animal.name ?? "Animal disponível"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {animal.name ?? "Sem nome"}
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            {SPECIES_LABEL[animal.species]} • {breed}
          </p>

          <div className="flex items-center gap-2 text-gray-600 mb-6">
            <MapPin className="w-5 h-5" />
            <Link
              href={`/shelters/${animal.shelter.id}`}
              className="hover:text-blue-600"
            >
              {animal.shelter.name}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetaCard
              label="Idade"
              value={ageLabelMonths(animal.estimated_age_months)}
            />
            <MetaCard label="Porte" value={SIZE_LABEL[animal.size]} />
            <MetaCard label="Castrado" value={animal.neutered ? "Sim" : "Não"} />
            <MetaCard
              label="Doenças"
              value={animal.health_notes?.trim() || "Nenhuma"}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-2 mb-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <p className="font-medium text-blue-900">Temperamento</p>
            </div>
            <p className="text-blue-800 ml-7">{temperament}</p>
          </div>

          <div className="flex gap-3">
            <AdoptionRequestDialog
              animalId={animal.id}
              animalName={animal.name ?? "este animal"}
              shelterName={animal.shelter.name}
              isAuthenticated={Boolean(user)}
              isAvailable={animal.status === "available"}
            />
            <button
              type="button"
              aria-label="Favoritar"
              className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
            >
              <Heart className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{value}</p>
    </div>
  );
}
