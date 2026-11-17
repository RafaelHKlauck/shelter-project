import { execSync } from "node:child_process";

/**
 * No ambiente local, recarrega o banco (migrations + supabase/seed.sql) antes da execução,
 * para que a massa de testes seja sempre a mesma (seção 9.3). Em produção não faz nada.
 */
export default async function globalSetup() {
  if (process.env.E2E_TARGET === "prod" || process.env.E2E_SKIP_RESET === "1") return;
  console.log("[e2e] supabase db reset (massa de testes local)...");
  execSync("supabase db reset", { stdio: "inherit" });
}
