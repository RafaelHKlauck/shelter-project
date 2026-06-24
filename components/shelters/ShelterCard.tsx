import Link from "next/link";
import { MapPin, PawPrint, AlertCircle } from "lucide-react";

export type ShelterCardData = {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  needs_supplies: boolean;
  animals_count: number;
  distance_km?: number | null;
};

const FALLBACK = "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=800";

export function ShelterCard({ shelter }: { shelter: ShelterCardData }) {
  return (
    <Link
      href={`/shelters/${shelter.id}`}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group"
    >
      <div className="relative aspect-video overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shelter.cover_url ?? FALLBACK}
          alt={shelter.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {shelter.needs_supplies && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Precisa de doações
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2">{shelter.name}</h3>

        {shelter.distance_km != null && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
            <MapPin className="w-4 h-4" />
            <span>{shelter.distance_km} km de você</span>
          </div>
        )}

        {shelter.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {shelter.description}
          </p>
        )}

        <div className="flex items-center gap-1 text-sm text-gray-500">
          <PawPrint className="w-4 h-4" />
          <span>{shelter.animals_count} animais disponíveis</span>
        </div>
      </div>
    </Link>
  );
}
