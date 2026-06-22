import { requireUser } from "@/lib/auth/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  await requireUser();
  return <ResetPasswordForm />;
}
