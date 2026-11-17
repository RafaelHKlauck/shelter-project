import { expect, test } from "@playwright/test";
import { RUN, api, at, cleanup, createShift, enroll, enrollmentsOf, futureDay, loginAs, myShift, toast, closeContextsAfterEach } from "./support/helpers";

closeContextsAfterEach();

test.describe("UC06/UC07 — Cancelar inscrição e promover a lista de espera", () => {
  test.afterAll(cleanup);

  test("CT06_01 — cancelamento com mais de 12 horas de antecedência", async ({ browser }) => {
    const day = futureDay(9);
    const title = `CT06_01 Cancelável · ${RUN}`;
    const id = await createShift({ title, startsAt: at(day, "09:00"), endsAt: at(day, "10:00") });
    await enroll("jorge", id);

    const jorge = await loginAs(browser, "jorge");
    await jorge.goto("/volunteering");
    const row = myShift(jorge, title);
    await row.getByRole("button", { name: "Cancelar inscrição" }).click();
    await jorge.getByRole("dialog").getByRole("button", { name: "Cancelar inscrição" }).click();
    await expect(toast(jorge, "Inscrição cancelada.")).toBeVisible();
    await expect(row).toHaveCount(0);
    expect((await enrollmentsOf(id))[0].status).toBe("cancelled");
  });

  test("CT06_02 — com 11h50 de antecedência o botão não aparece e o banco recusa", async ({ browser }) => {
    const start = new Date(Date.now() + (11 * 60 + 55) * 60_000); // TX: 11h55 a partir de agora
    const title = `CT06_02 TX · ${RUN}`;
    const id = await createShift({
      title,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 60 * 60_000).toISOString(),
    });
    const { enrollment_id } = await enroll("jorge", id);

    const jorge = await loginAs(browser, "jorge");
    await jorge.goto("/volunteering");
    const row = myShift(jorge, title);
    await expect(row).toContainText("Faltam menos de 12 horas. Para cancelar, fale com a coordenação do abrigo.");
    await expect(row.getByRole("button", { name: "Cancelar inscrição" })).toHaveCount(0);

    // chamada direta da função com o usuário do Jorge
    const { error } = await (await api("jorge")).rpc("cancel_enrollment", { p_enrollment_id: enrollment_id });
    expect(error?.message).toContain("O prazo de cancelamento terminou");
    expect((await enrollmentsOf(id))[0].status).toBe("confirmed");
  });

  test("CT06_03 — cancelamento com pessoas na lista de espera", async ({ browser }) => {
    const day = futureDay(10);
    const title = `CT06_03 TY · ${RUN}`;
    const id = await createShift({ title, capacity: 1, startsAt: at(day, "09:00"), endsAt: at(day, "10:00") });
    await enroll("jorge", id);
    expect((await enroll("lucas", id)).waitlist_position).toBe(1);
    expect((await enroll("maria", id)).waitlist_position).toBe(2);

    const jorge = await loginAs(browser, "jorge");
    await jorge.goto("/volunteering");
    await myShift(jorge, title).getByRole("button", { name: "Cancelar inscrição" }).click();
    await jorge.getByRole("dialog").getByRole("button", { name: "Cancelar inscrição" }).click();
    await expect(toast(jorge, "Inscrição cancelada.")).toBeVisible();

    const lucas = await loginAs(browser, "lucas");
    await lucas.goto("/volunteering");
    await expect(myShift(lucas, title)).toContainText("Inscrito");
    await lucas.getByRole("button", { name: /Notificações/ }).click();
    await expect(lucas.getByText(`Você conseguiu a vaga: ${title}`)).toBeVisible();

    const maria = await loginAs(browser, "maria");
    await maria.goto("/volunteering");
    await expect(myShift(maria, title)).toContainText("Na lista de espera (posição 1)");

    const rows = await enrollmentsOf(id);
    expect(rows.filter((r) => r.status === "confirmed")).toHaveLength(1);
  });

  test("CT06_05 — saída da lista de espera recalcula as posições", async ({ browser }) => {
    const day = futureDay(11);
    const title = `CT06_05 Fila · ${RUN}`;
    const id = await createShift({ title, capacity: 1, startsAt: at(day, "09:00"), endsAt: at(day, "10:00") });
    await enroll("jorge", id);
    await enroll("lucas", id);
    await enroll("maria", id);

    const lucas = await loginAs(browser, "lucas");
    await lucas.goto("/volunteering");
    await myShift(lucas, title).getByRole("button", { name: "Sair da fila" }).click();
    await lucas.getByRole("dialog").getByRole("button", { name: "Sair da fila" }).click();
    await expect(toast(lucas, "Você saiu da lista de espera.")).toBeVisible();

    const maria = (await enrollmentsOf(id)).find((r) => r.status === "waitlisted");
    expect(maria?.waitlist_position).toBe(1);
  });
});
