import { expect, test } from "@playwright/test";
import {
  RUN,
  agendaCard,
  at,
  cleanup,
  createShift,
  enroll,
  enrollmentsOf,
  futureDay,
  loginAs,
  openAgenda,
  toast,
  closeContextsAfterEach,
} from "./support/helpers";

closeContextsAfterEach();

test.describe("UC04/UC05 — Inscrever-se em turno e lista de espera", () => {
  test.afterAll(cleanup);

  test("CT04_01 — inscrição em turno com vaga disponível", async ({ browser }) => {
    const day = futureDay(1);
    const title = `CT04_01 Passeio com os cães · ${RUN}`;
    await createShift({ title, capacity: 3, startsAt: at(day, "09:00"), endsAt: at(day, "12:00") });

    const jorge = await loginAs(browser, "jorge");
    await openAgenda(jorge, day);
    const card = agendaCard(jorge, title);
    await expect(card).toContainText("3 vagas restantes");

    // 1º toque
    await card.getByRole("button", { name: "Quero participar" }).click();
    const dialog = jorge.getByRole("dialog");
    await expect(dialog).toContainText("Confirmar inscrição?");
    await expect(dialog).toContainText("das 09h00 às 12h00");
    // 2º toque (RNF10: no máximo dois toques)
    await dialog.getByRole("button", { name: "Confirmar inscrição" }).click();

    await expect(toast(jorge, "Inscrição confirmada")).toBeVisible();
    await expect(card).toContainText("Inscrito");
    await expect(card).toContainText("2 vagas restantes");
    // notificação de confirmação no sino
    await expect(jorge.getByRole("button", { name: /Notificações: \d+ não lidas?/ })).toBeVisible();
    await jorge.getByRole("button", { name: /Notificações/ }).click();
    await expect(jorge.getByText(`Inscrição confirmada: ${title}`)).toBeVisible();
  });

  test("CT04_08 — inscrição repetida: o turno mostra a situação atual e não oferece nova inscrição", async ({ browser }) => {
    const day = futureDay(1);
    const title = `CT04_08 Repetida · ${RUN}`;
    const id = await createShift({ title, startsAt: at(day, "13:00"), endsAt: at(day, "14:00") });
    await enroll("jorge", id);

    const jorge = await loginAs(browser, "jorge");
    await openAgenda(jorge, day);
    await expect(agendaCard(jorge, title)).toContainText("Inscrito");
    await expect(agendaCard(jorge, title).getByRole("button", { name: "Quero participar" })).toHaveCount(0);
    expect((await enrollmentsOf(id)).filter((e) => e.status === "confirmed")).toHaveLength(1);
  });

  test("CT03_02 — inscrição em uma sessão atualiza as vagas na outra em até 3 segundos", async ({ browser }) => {
    const day = futureDay(2);
    const title = `CT03_02 Tempo real · ${RUN}`;
    const id = await createShift({ title, capacity: 3, startsAt: at(day, "09:00"), endsAt: at(day, "10:00") });

    const jorge = await loginAs(browser, "jorge");
    await openAgenda(jorge, day);
    await expect(agendaCard(jorge, title)).toContainText("3 vagas restantes");
    await jorge.evaluate(() => ((window as unknown as { __semReload: boolean }).__semReload = true));
    await jorge.waitForTimeout(1500); // canal do Realtime assinado

    await enroll("lucas", id); // outra pessoa, outra sessão
    await expect(agendaCard(jorge, title)).toContainText("2 vagas restantes", { timeout: 3_000 });
    expect(await jorge.evaluate(() => (window as unknown as { __semReload?: boolean }).__semReload)).toBe(true);
  });

  test("CT04_06 — duas pessoas disputando a última vaga ao mesmo tempo", async ({ browser }) => {
    const day = futureDay(2);
    const title = `CT04_06 Limpeza dos canis · ${RUN}`;
    const id = await createShift({ title, capacity: 1, task: "cleaning", startsAt: at(day, "13:00"), endsAt: at(day, "16:00") });

    const [jorge, lucas] = await Promise.all([loginAs(browser, "jorge"), loginAs(browser, "lucas")]);
    await Promise.all([openAgenda(jorge, day), openAgenda(lucas, day)]);
    await Promise.all([
      agendaCard(jorge, title).getByRole("button", { name: "Quero participar" }).click(),
      agendaCard(lucas, title).getByRole("button", { name: "Quero participar" }).click(),
    ]);
    // os dois confirmam ao mesmo tempo
    await Promise.all([
      jorge.getByRole("dialog").getByRole("button", { name: "Confirmar inscrição" }).click(),
      lucas.getByRole("dialog").getByRole("button", { name: "Confirmar inscrição" }).click(),
    ]);

    const rows = await expect
      .poll(async () => (await enrollmentsOf(id)).map((e) => e.status).sort(), { timeout: 10_000 })
      .toEqual(["confirmed", "waitlisted"])
      .then(() => enrollmentsOf(id));
    expect(rows.find((r) => r.status === "waitlisted")?.waitlist_position).toBe(1);

    // um recebeu a confirmação e o outro foi informado da lista de espera
    const confirmedOn = await Promise.all([jorge, lucas].map((p) => toast(p, "Inscrição confirmada").isVisible()));
    const waitlistedOn = await Promise.all([jorge, lucas].map((p) => toast(p, "lista de espera na posição 1").isVisible()));
    expect(confirmedOn.filter(Boolean)).toHaveLength(1);
    expect(waitlistedOn.filter(Boolean)).toHaveLength(1);
    expect(confirmedOn).not.toEqual(waitlistedOn);
  });

  test("CT04_03 — inscrição com conflito de horário em outro abrigo", async ({ browser }) => {
    const day = futureDay(3);
    const t3 = `CT04_03 Feira de adoção · ${RUN}`;
    const t1 = `CT04_03 Passeio · ${RUN}`;
    const t4 = `CT04_03 Banho e escovação · ${RUN}`;
    const id3 = await createShift({ by: "rafael", shelter: "refugio", title: t3, task: "event", startsAt: at(day, "10:00"), endsAt: at(day, "14:00") });
    await createShift({ title: t1, startsAt: at(day, "09:00"), endsAt: at(day, "12:00") });
    await createShift({ title: t4, task: "care", startsAt: at(day, "14:00"), endsAt: at(day, "15:00") });
    await enroll("maria", id3); // Maria confirmada no T3

    const maria = await loginAs(browser, "maria");
    await openAgenda(maria, day);

    await agendaCard(maria, t1).getByRole("button", { name: "Quero participar" }).click();
    await maria.getByRole("dialog").getByRole("button", { name: "Confirmar inscrição" }).click();
    await expect(toast(maria, t3)).toBeVisible();
    await expect(toast(maria, "Refúgio Animal")).toBeVisible();
    await expect(agendaCard(maria, t1)).not.toContainText("Inscrito");

    await agendaCard(maria, t4).getByRole("button", { name: "Quero participar" }).click();
    await maria.getByRole("dialog").getByRole("button", { name: "Confirmar inscrição" }).click();
    await expect(toast(maria, "Inscrição confirmada")).toBeVisible();
    await expect(agendaCard(maria, t4)).toContainText("Inscrito");
  });

  test("CT04_02 — turno lotado: entrada na lista de espera", async ({ browser }) => {
    const day = futureDay(4);
    const title = `CT04_02 Lotado · ${RUN}`;
    const id = await createShift({ title, capacity: 1, startsAt: at(day, "09:00"), endsAt: at(day, "10:00") });
    await enroll("jorge", id);

    const lucas = await loginAs(browser, "lucas");
    await openAgenda(lucas, day);
    const card = agendaCard(lucas, title);
    await expect(card).toContainText("Lotado");
    await card.getByRole("button", { name: "Entrar na lista de espera" }).click();
    await expect(lucas.getByRole("dialog")).toContainText("Entrar na lista de espera?");
    await lucas.getByRole("dialog").getByRole("button", { name: "Entrar na fila" }).click();
    await expect(card).toContainText("Na lista de espera (posição 1)");
    expect((await enrollmentsOf(id)).filter((e) => e.status === "confirmed")).toHaveLength(1);
  });
});
