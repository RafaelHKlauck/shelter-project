import Link from "next/link";
import { MapPin, Home, Award, PawPrint, Calendar, Pencil } from "lucide-react";
import { requireProfile } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { LocationWarning } from "@/components/ui/LocationWarning";
import { SPECIES_LABEL } from "@/lib/format/animals";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400";

function calcAge(birth: string): number {
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export default async function ProfilePage() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: adoptions }, { data: volunteerings }] = await Promise.all([
    supabase
      .from("requests")
      .select(
        "id, finalized_at, animal:animals(id, name, species, cover_url), shelter:shelters(id, name)",
      )
      .eq("requester_id", user.id)
      .eq("kind", "adoption")
      .eq("status", "finalized")
      .order("finalized_at", { ascending: false }),
    supabase
      .from("shelter_members")
      .select(
        "role, shelter:shelters(id, name, cover_url, address_city, address_state)",
      )
      .eq("user_id", user.id)
      .in("role", ["volunteer", "editor", "admin"]),
  ]);

  const isVolunteer = (volunteerings ?? []).some((v) => v.role === "volunteer");
  const housingLabel = profile.housing_type === "house" ? "Casa" : "Apartamento";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {!profile.location && (
        <LocationWarning
          message="Sua localização ainda não foi resolvida. A busca por distância em /animais e /abrigos vai ignorar seu endereço até você revisar."
          actionHref="/profile/edit"
          actionLabel="Revisar endereço"
        />
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex gap-6 items-start mb-6 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar_url ?? FALLBACK_AVATAR}
            alt={profile.full_name}
            className="w-24 h-24 rounded-full object-cover"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.full_name}
              </h1>
              {isVolunteer && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                  <Award className="w-4 h-4" />
                  Voluntário
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-1">
              {calcAge(profile.birth_date)} anos
            </p>
            {profile.cpf_encrypted && (
              <p className="text-gray-600">CPF: {profile.cpf_encrypted}</p>
            )}
          </div>

          <Link
            href="/profile/edit"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Pencil className="w-4 h-4" />
            Editar perfil
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-2 text-gray-600">
            <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>
              {profile.address_line}
              {profile.address_number ? `, ${profile.address_number}` : ""} -{" "}
              {profile.address_city}/{profile.address_state}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Home className="w-5 h-5" />
            <span>{housingLabel}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Animais Adotados</h2>

        {!adoptions || adoptions.length === 0 ? (
          <p className="text-gray-500">
            Você ainda não finalizou nenhuma adoção.
          </p>
        ) : (
          <div className="space-y-4">
            {adoptions.map((row) => {
              const animal = row.animal;
              if (!animal) return null;
              return (
                <Link
                  key={row.id}
                  href={`/animals/${animal.id}`}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      animal.cover_url ??
                      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400"
                    }
                    alt={animal.name ?? "Animal"}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">
                      {animal.name ?? "Sem nome"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {SPECIES_LABEL[animal.species]}
                      {row.shelter ? ` • ${row.shelter.name}` : ""}
                    </p>
                    {row.finalized_at && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Adotado em{" "}
                          {new Date(row.finalized_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {volunteerings && volunteerings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Voluntariado</h2>

          <div className="space-y-4">
            {volunteerings.map((v) => {
              const s = v.shelter;
              if (!s) return null;
              return (
                <Link
                  key={s.id}
                  href={`/shelters/${s.id}`}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      s.cover_url ??
                      "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400"
                    }
                    alt={s.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{s.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {s.address_city}/{s.address_state}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <PawPrint className="w-4 h-4 text-gray-400" />
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">
                        {v.role === "admin"
                          ? "Administrador"
                          : v.role === "editor"
                            ? "Editor"
                            : "Voluntário"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
