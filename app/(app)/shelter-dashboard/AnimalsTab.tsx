import Link from "next/link";
import { SIZE_LABEL, SPECIES_LABEL, ageLabelMonths } from "@/lib/format/animals";
import type { Database } from "@/lib/supabase/types";

type Animal = Pick<
  Database["public"]["Tables"]["animals"]["Row"],
  "id" | "name" | "species" | "breed" | "size" | "estimated_age_months" | "status" | "cover_url"
>;

const FALLBACK = "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=400";

export function AnimalsTab({ animals }: { animals: Animal[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Animais Cadastrados</h2>
        <Link
          href="/shelter-dashboard/animals/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Adicionar Animal
        </Link>
      </div>

      {animals.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Você ainda não cadastrou nenhum animal.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {animals.map((a) => (
            <Link
              key={a.id}
              href={`/shelter-dashboard/animals/${a.id}/edit`}
              className="border border-gray-200 rounded-lg p-4 flex gap-4 hover:border-gray-400 transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.cover_url ?? FALLBACK}
                alt={a.name ?? "Animal"}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 mb-1">
                  {a.name ?? "Sem nome"}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  {SPECIES_LABEL[a.species]} •{" "}
                  {a.breed?.trim() || "SRD"} • {SIZE_LABEL[a.size]} •{" "}
                  {ageLabelMonths(a.estimated_age_months)}
                </p>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    a.status === "available"
                      ? "bg-green-50 text-green-700"
                      : a.status === "adopted"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {a.status === "available"
                    ? "Disponível"
                    : a.status === "adopted"
                      ? "Adotado"
                      : a.status === "reserved"
                        ? "Reservado"
                        : "Indisponível"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
