import { expect, test } from "@playwright/test";
import { RUN, agendaCard, at, cleanup, createShift, futureDay, loginAs, openAgenda, closeContextsAfterEach } from "./support/helpers";

closeContextsAfterEach();

test.describe("UC03 — Consultar agenda de turnos", () => {
  const day = futureDay(0);
  const tEsperanca = `CT03_01 Passeio Esperança · ${RUN}`;
  const tRefugio = `CT03_01 Feira Refúgio · ${RUN}`;

  test.beforeAll(async () => {
    await createShift({ title: tEsperanca, task: "walk", startsAt: at(day, "07:00"), endsAt: at(day, "08:00") });
    await createShift({
      by: "rafael",
      shelter: "refugio",
      title: tRefugio,
      task: "event",
      startsAt: at(day, "18:00"),
      endsAt: at(day, "19:00"),
    });
  });
  test.afterAll(cleanup);

  test("CT03_01 — voluntária de dois abrigos vê os turnos dos dois e usa os filtros", async ({ browser }) => {
    const maria = await loginAs(browser, "maria");
    await openAgenda(maria, day);

    await expect(agendaCard(maria, tEsperanca)).toContainText("Abrigo Esperança");
    await expect(agendaCard(maria, tRefugio)).toContainText("Refúgio Animal");
    await expect(agendaCard(maria, tEsperanca)).toContainText("3 vagas restantes");

    await maria.getByLabel("Abrigo", { exact: true }).selectOption({ label: "Refúgio Animal" });
    await expect(agendaCard(maria, tRefugio)).toBeVisible();
    await expect(agendaCard(maria, tEsperanca)).toHaveCount(0);

    await maria.getByLabel("Abrigo", { exact: true }).selectOption({ label: "Todos os meus abrigos" });
    await maria.getByLabel("Tipo de tarefa").selectOption({ label: "Passeio" });
    await expect(agendaCard(maria, tEsperanca)).toBeVisible();
    await expect(agendaCard(maria, tRefugio)).toHaveCount(0);

    // visualização mensal
    await maria.getByRole("button", { name: "Mês" }).click();
    await expect(maria.getByRole("button", { name: "Mês" })).toHaveAttribute("aria-pressed", "true");
  });

  test("CT03_03 — quem ainda não é voluntário não vê nenhum turno", async ({ browser }) => {
    const joao = await loginAs(browser, "joao");
    await joao.goto("/volunteering");
    await expect(
      joao.getByText("A agenda de turnos fica disponível depois que a sua candidatura ao voluntariado for aprovada"),
    ).toBeVisible();
    await expect(joao.locator('section[aria-labelledby="agenda-title"]')).toHaveCount(0);
    await expect(joao.getByRole("link", { name: "Voluntariado" })).toHaveCount(0);
  });

  test("CT01_07 — voluntário não vê a aba Escala no painel", async ({ browser }) => {
    const maria = await loginAs(browser, "maria");
    await maria.goto("/shelter-dashboard");
    await expect(maria.getByRole("button", { name: "Solicitações" })).toBeVisible();
    await expect(maria.getByRole("button", { name: "Escala", exact: true })).toHaveCount(0);
  });
});
