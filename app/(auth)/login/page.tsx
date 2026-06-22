import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getUser();
  if (user) redirect("/");
  return <LoginForm />;
}
