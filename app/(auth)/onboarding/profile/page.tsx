import { redirect } from "next/navigation";
import { getProfile, requireUser } from "@/lib/auth/server";
import { ProfileOnboardingForm } from "./ProfileOnboardingForm";

export default async function OnboardingProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (profile) redirect("/");
  return <ProfileOnboardingForm />;
}
