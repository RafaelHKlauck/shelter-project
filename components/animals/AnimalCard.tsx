import Link from "next/link";
import { MapPin, Heart } from "lucide-react";
import { SIZE_LABEL, SPECIES_LABEL, ageLabelMonths } from "@/lib/format/animals";
import type { Database } from "@/lib/supabase/types";

export type AnimalCardData = {
  id: string;
  name: string | null;
  species: Database["public"]["Enums"]["animal_species"];
  breed: string | null;
  size: Database["public"]["Enums"]["animal_size"];
  estimated_age_months: number;
  neutered: boolean;
  cover_url: string | null;
  shelter_name: string;
  distance_km?: number | null;
};

const FALLBACK = "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=800";

export function AnimalCard({ animal }: { animal: AnimalCardData }) {
  const breed = animal.breed?.trim() || "Sem raça definida";
  return (
    <Link
      href={`/animals/${animal.id}`}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
    >
      <div className="relative aspect-square overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={animal.cover_url ?? FALLBACK}
          alt={animal.name ?? "Animal disponível para adoção"}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <button
          type="button"
          aria-label="Favoritar"
          className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <Heart className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-1">
          {animal.name ?? "Sem nome"}
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          {SPECIES_LABEL[animal.species]} • {breed} •{" "}
          {ageLabelMonths(animal.estimated_age_months)}
        </p>

        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4" />
          <span>
            {animal.shelter_name}
            {animal.distance_km != null && ` • ${animal.distance_km} km`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
            {SIZE_LABEL[animal.size]}
          </span>
          {animal.neutered && (
            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
              Castrado
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
