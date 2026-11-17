import { defineConfig, devices } from "@playwright/test";

/**
 * Testes E2E da escala de voluntariado (casos de teste da seção 9.6 da proposta).
 *
 *   pnpm test:e2e        → app local (build de produção na porta 3100) + Supabase local resetado
 *   pnpm test:e2e:prod   → app publicado (https://shelter-project-seven.vercel.app)
 *   pnpm e2e:report      → abre o relatório HTML (playwright-report/index.html)
 */
const isProd = process.env.E2E_TARGET === "prod";
const baseURL = process.env.E2E_BASE_URL ?? (isProd ? "https://shelter-project-seven.vercel.app" : "http://localhost:3100");

export default defineConfig({
  testDir: "./e2e",
  // os casos compartilham os mesmos usuários (Jorge, Lucas, Maria): rodam em sequência
  fullyParallel: false,
  workers: 1,
  retries: isProd ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  globalSetup: "./e2e/support/global-setup.ts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "on",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "celular-360px",
      use: { ...devices["Pixel 5"], viewport: { width: 360, height: 800 } },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: isProd
    ? undefined
    : {
        command: "pnpm build && pnpm start --port 3100",
        url: "http://localhost:3100",
        reuseExistingServer: true,
        timeout: 240_000,
      },
});
