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

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("shelter_members")
      .select("shelter_id")
      .eq("user_id", user.id)
      .limit(1);
    isShelterMember = (data ?? []).length > 0;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={Boolean(user)} isShelterMember={isShelterMember} />
      <main className="flex-1 bg-gray-50">{children}</main>
      <Footer />
    </div>
  );
}
