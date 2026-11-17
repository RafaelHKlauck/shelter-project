import { expect, test } from "@playwright/test";
import { IS_PROD } from "./support/env";
import { api, loginAs, openScheduleTab, closeContextsAfterEach, newAnonymousPage } from "./support/helpers";

closeContextsAfterEach();

test.describe("UC14 — Indicadores e regressão", () => {
  test("CT14_01 — indicadores da escala no painel", async ({ browser }) => {
    const carla = await loginAs(browser, "carla");
    await openScheduleTab(carla);
    await expect(carla.getByText("Ocupação dos turnos (próximos 7 dias)")).toBeVisible();
    await expect(carla.getByText("Taxa de presença (últimos 30 dias)")).toBeVisible();
    await expect(carla.getByText("Turnos sem inscritos (próximos 7 dias)")).toBeVisible();
    await expect(carla.getByRole("heading", { name: "Voluntários bloqueados" })).toBeVisible();
  });

  test("CTR_01 — aprovação da candidatura de voluntariado libera a agenda", async ({ browser }) => {
    test.skip(IS_PROD, "Altera a massa de produção de forma permanente: executado só no ambiente local.");
    const { data: pending } = await (await api("carla"))
      .from("requests")
      .select("id")
      .eq("kind", "volunteer")
      .eq("status", "pending");
    test.skip(!pending?.length, "A candidatura do João já foi aprovada nesta massa de dados.");

    const carla = await loginAs(browser, "carla");
    await carla.goto("/shelter-dashboard");
    const card = carla.locator("div", { hasText: "João Santos" }).filter({ has: carla.getByRole("button", { name: "Aprovar" }) }).last();
    await card.getByRole("button", { name: "Aprovar" }).click();
    await expect(carla.locator("[data-sonner-toast]", { hasText: "Solicitação aprovada" })).toBeVisible();

    const joao = await loginAs(browser, "joao");
    await expect(joao.getByRole("link", { name: "Voluntariado" })).toBeVisible();
    await joao.goto("/volunteering");
    await expect(joao.getByRole("heading", { name: "Agenda de voluntariado" })).toBeVisible();
    await expect(joao.locator('section[aria-labelledby="agenda-title"]')).toBeVisible();
  });

  test("CTR_02 — páginas existentes do AdotaPet continuam funcionando", async ({ browser }) => {
    const page = await newAnonymousPage(browser);
    for (const path of ["/", "/animals", "/shelters"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
    }
    const carla = await loginAs(browser, "carla");
    for (const path of ["/messages", "/profile", "/shelter-dashboard"]) {
      const res = await carla.goto(path);
      expect(res?.status(), path).toBeLessThan(400);
    }
    await expect(carla.getByRole("button", { name: "Solicitações" })).toBeVisible();
  });
});
