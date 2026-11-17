import fs from "node:fs";
import path from "node:path";

export const IS_PROD = process.env.E2E_TARGET === "prod";

// Em produção as chaves vêm do .env do projeto (chave publicável, sem segredos).
if (IS_PROD && fs.existsSync(path.join(process.cwd(), ".env"))) {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
}

export const SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? (IS_PROD ? process.env.NEXT_PUBLIC_SUPABASE_URL! : "http://127.0.0.1:54321");

// chave publicável padrão do `supabase start` (só vale no ambiente local)
export const SUPABASE_KEY =
  process.env.E2E_SUPABASE_KEY ??
  (IS_PROD ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISH_KEY! : "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH");

/** Senha dos usuários de demonstração (README do Grau B e supabase/seed.sql). */
export const PASSWORD = process.env.E2E_PASSWORD ?? "adota123";

export const USERS = {
  carla: { email: "admin@esperanca.test", name: "Carla Ferreira" },
  rafael: { email: "admin@refugio.test", name: "Rafael Lima" },
  maria: { email: "voluntaria@adotapet.test", name: "Maria Silva" },
  jorge: { email: "jorge@adotapet.test", name: "Jorge Menezes" },
  lucas: { email: "lucas@adotapet.test", name: "Lucas Pereira" },
  joao: { email: "joao@adotapet.test", name: "João Santos" },
} as const;

export type UserKey = keyof typeof USERS;

export const SHELTERS = {
  esperanca: "Abrigo Esperança",
  refugio: "Refúgio Animal",
} as const;
