import { expect, test, type Page } from "@playwright/test";
import {
  RUN,
  agendaCard,
  api,
  at,
  cleanup,
  createShift,
  enroll,
  expandManagedShift,
  futureDay,
  loginAs,
  openAgenda,
  openScheduleTab,
  toast,
  closeContextsAfterEach,
} from "./support/helpers";

async function fillShiftForm(page: Page, v: { title: string; date: string; start: string; end: string; capacity: string }) {
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Cadastrar turno" }) });
  await form.getByLabel("Título").fill(v.title);
  await form.getByLabel("Número de vagas (1 a 20)").fill(v.capacity);
  await form.getByLabel("Data").fill(v.date);
  await form.getByLabel("Início").fill(v.start);
  await form.getByLabel("Término").fill(v.end);
  return form;
}

/** Cancela, como Carla, os turnos com o título informado (criados pela tela). */
async function cancelByTitle(prefix: string) {
  const c = await api("carla");
  const { data } = await c.from("volunteer_shifts").select("id").like("title", `${prefix}%`).eq("status", "scheduled");
  for (const s of data ?? []) await c.rpc("cancel_shift", { p_shift_id: s.id });
}

closeContextsAfterEach();

test.describe("UC01/UC02 — Gerenciar turnos (coordenação)", () => {
  test.afterAll(async () => {
    await cleanup();
    await cancelByTitle(`CT01_01 Passeio da tarde · ${RUN}`);
    await cancelByTitle(`CT02_01 Série semanal · ${RUN}`);
  });

  test("CT01_02 — número de vagas nos limites (0 e 21 recusados)", async ({ browser }) => {
    const carla = await loginAs(browser, "carla");
    await openScheduleTab(carla);
    for (const cap of ["0", "21"]) {
      const form = await fillShiftForm(carla, { title: `CT01_02 · ${RUN}`, date: futureDay(5), start: "09:00", end: "11:00", capacity: cap });
      await form.getByRole("button", { name: "Cadastrar turno" }).click();
      await expect(form.getByText("O número de vagas deve estar entre 1 e 20")).toBeVisible();
    }
  });

  test("CT01_03 — duração nos limites (59 min e 8h01 recusados)", async ({ browser }) => {
    const carla = await loginAs(browser, "carla");
    await openScheduleTab(carla);
    for (const end of ["09:59", "17:01"]) {
      const form = await fillShiftForm(carla, { title: `CT01_03 · ${RUN}`, date: futureDay(5), start: "09:00", end, capacity: "2" });
      await form.getByRole("button", { name: "Cadastrar turno" }).click();
      await expect(form.getByText("O turno deve durar no mínimo 1 hora e no máximo 8 horas.")).toBeVisible();
    }
  });

  test("CT01_01 — cadastro de turno válido aparece na Escala e na agenda dos voluntários", async ({ browser }) => {
    const day = futureDay(5);
    const title = `CT01_01 Passeio da tarde · ${RUN}`;
    const carla = await loginAs(browser, "carla");
    await openScheduleTab(carla);
    const form = await fillShiftForm(carla, { title, date: day, start: "14:00", end: "16:00", capacity: "3" });
    await form.getByRole("button", { name: "Cadastrar turno" }).click();
    await expect(toast(carla, "Turno criado.")).toBeVisible();

    const item = carla.locator('section[aria-labelledby="shifts-title"] li', { hasText: title }).first();
    await expect(item).toContainText("Agendado");
    await expect(item).toContainText("0/3 confirmados");

    const jorge = await loginAs(browser, "jorge");
    await openAgenda(jorge, day);
    await expect(agendaCard(jorge, title)).toContainText("14h00 às 16h00");
    await expect(agendaCard(jorge, title)).toContainText("3 vagas restantes");
  });

  test("CT02_01 — turno semanal repetido por 4 semanas", async ({ browser }) => {
    const title = `CT02_01 Série semanal · ${RUN}`;
    const carla = await loginAs(browser, "carla");
    await openScheduleTab(carla);
    const form = await fillShiftForm(carla, { title, date: futureDay(6), start: "07:00", end: "08:00", capacity: "2" });
    await form.getByLabel("Repetir toda semana").check();
    await form.getByLabel("Por quantas semanas (2 a 12)").fill("4");
    await form.getByRole("button", { name: "Cadastrar turno" }).click();
    await expect(toast(carla, "4 turnos criados.")).toBeVisible();
    await expect(carla.locator('section[aria-labelledby="shifts-title"] li', { hasText: title })).toHaveCount(4);
    await expect(carla.locator('section[aria-labelledby="shifts-title"] li', { hasText: title }).first()).toContainText("Semanal");
  });

  test("CT01_05 — redução de vagas para menos do que o número de confirmados é recusada", async ({ browser }) => {
    const day = futureDay(7);
    const title = `CT01_05 Vagas · ${RUN}`;
    const id = await createShift({ title, capacity: 3, startsAt: at(day, "09:00"), endsAt: at(day, "10:00") });
    await enroll("jorge", id);
    await enroll("lucas", id);
    await enroll("maria", id);

    const carla = await loginAs(browser, "carla");
    await openScheduleTab(carla);
    const item = await expandManagedShift(carla, title);
    await item.getByRole("button", { name: "Editar turno" }).click();
    await item.getByLabel("Número de vagas (1 a 20)").fill("2");
    await item.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(toast(carla, "3 inscrições confirmadas")).toBeVisible();
    await expect(item).toContainText("3/3 confirmados");
  });

  test("CT01_06 — cancelamento de turno com inscritos e fila", async ({ browser }) => {
    const day = futureDay(8);
    const title = `CT01_06 Cancelamento · ${RUN}`;
    const id = await createShift({ title, capacity: 1, startsAt: at(day, "09:00"), endsAt: at(day, "10:00") });
    await enroll("jorge", id);
    await enroll("lucas", id); // fila

    const carla = await loginAs(browser, "carla");
    await openScheduleTab(carla);
    const item = await expandManagedShift(carla, title);
    // RN14: com inscritos não há "Excluir"
    await expect(item.getByRole("button", { name: "Excluir" })).toHaveCount(0);
    await item.getByRole("button", { name: "Cancelar turno" }).click();
    await carla.getByRole("dialog").getByRole("button", { name: "Cancelar só este" }).click();
    await expect(toast(carla, "Turno cancelado")).toBeVisible();

    // confirmados e fila foram avisados
    for (const user of ["jorge", "lucas"] as const) {
      const { data } = await (await api(user))
        .from("notifications")
        .select("kind")
        .eq("kind", "shift.cancelled")
        .eq("payload->>shift_id", id);
      expect(data ?? []).toHaveLength(1);
    }
    // o turno sai da agenda
    const jorge = await loginAs(browser, "jorge");
    await openAgenda(jorge, day);
    await expect(agendaCard(jorge, title)).toHaveCount(0);
  });
});
