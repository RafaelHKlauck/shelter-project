import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  const user = await getUser();
  if (user) redirect("/onboarding/profile");
  return <SignupForm />;
}
