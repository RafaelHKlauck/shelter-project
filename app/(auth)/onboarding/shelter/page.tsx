import { requireUser } from "@/lib/auth/server";
import { ShelterOnboardingForm } from "./ShelterOnboardingForm";

export default async function OnboardingShelterPage() {
  await requireUser();
  return <ShelterOnboardingForm />;
}
