import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  let isShelterMember = false;
  let isVolunteer = false;

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shelter_members")
      .select("shelter_id, role")
      .eq("user_id", user.id);
    isShelterMember = (data ?? []).length > 0;
    isVolunteer = (data ?? []).some((m) => m.role === "volunteer");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        userId={user?.id ?? null}
        isShelterMember={isShelterMember}
        isVolunteer={isVolunteer}
      />
      <main className="flex-1 bg-gray-50">{children}</main>
      <Footer />
    </div>
  );
}
