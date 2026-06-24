import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getUser();
  if (user) redirect("/onboarding/profile");
  const { next } = await searchParams;
  const intent = next === "shelter" ? "shelter" : "default";
  return <SignupForm intent={intent} />;
}
