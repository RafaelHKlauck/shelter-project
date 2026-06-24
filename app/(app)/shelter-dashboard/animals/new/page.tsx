import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { AnimalForm } from "../AnimalForm";

export default async function NewAnimalPage({
  searchParams,
}: {
  searchParams: Promise<{ shelter?: string }>;
}) {
  const user = await requireUser();
  const { shelter: querySelected } = await searchParams;
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("shelter_members")
    .select("shelter_id, role")
    .eq("user_id", user.id)
    .in("role", ["admin", "editor"]);

  if (!memberships?.length) redirect("/onboarding/shelter");

  const shelterId =
    memberships.find((m) => m.shelter_id === querySelected)?.shelter_id ??
    memberships[0].shelter_id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimalForm shelterId={shelterId} />
    </div>
  );
}
