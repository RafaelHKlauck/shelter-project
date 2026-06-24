import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { AnimalForm } from "../../AnimalForm";

export default async function EditAnimalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: animal } = await supabase
    .from("animals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!animal) notFound();

  const { data: membership } = await supabase
    .from("shelter_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("shelter_id", animal.shelter_id)
    .in("role", ["admin", "editor"])
    .maybeSingle();

  if (!membership) redirect("/shelter-dashboard");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimalForm
        shelterId={animal.shelter_id}
        initial={{
          id: animal.id,
          name: animal.name,
          species: animal.species,
          breed: animal.breed,
          size: animal.size,
          estimated_age_months: animal.estimated_age_months,
          neutered: animal.neutered,
          health_notes: animal.health_notes,
          temperament: animal.temperament,
          cover_url: animal.cover_url,
          status: animal.status,
        }}
      />
    </div>
  );
}
