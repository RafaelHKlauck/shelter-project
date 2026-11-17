import { expect, test } from "@playwright/test";
import { USERS } from "./support/env";
import { RUN, cleanup, createShift, enroll, expandManagedShift, loginAs, openScheduleTab, toast, closeContextsAfterEach, newAnonymousPage } from "./support/helpers";

closeContextsAfterEach();

test.describe("UC08/UC09/UC10/UC11 — Presença, horas e certificado", () => {
  test.describe.configure({ mode: "serial" });
  test.afterAll(cleanup);

  const title = `CT08_01 Passeio · ${RUN}`;
  let code = "";

  test("CT08_01 — presença com horário de entrada e saída (9h02 às 11h50 = 2h45)", async ({ browser }) => {
    // RN13 exige início no futuro e a RN15 só libera a presença a partir do início:
    // o turno começa em 20 segundos e dura 3 horas.
    const start = new Date(Date.now() + 20_000);
    const shiftId = await createShift({
      title,
      capacity: 3,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 3 * 3_600_000).toISOString(),
    });
    await enroll("jorge", shiftId);
    await enroll("lucas", shiftId);

    const carla = await loginAs(browser, "carla");
    const wait = start.getTime() - Date.now() + 2_000;
    if (wait > 0) await carla.waitForTimeout(wait);

    await openScheduleTab(carla);
    const item = await expandManagedShift(carla, title);
    await expect(item.getByRole("heading", { name: /Registrar presença/ })).toBeVisible();

    const jorgeRow = item.locator("li", { hasText: USERS.jorge.name });
    await jorgeRow.getByLabel("Presente").check();
    await jorgeRow.getByLabel("Entrada").fill("09:02");
    await jorgeRow.getByLabel("Saída").fill("11:50");
    await jorgeRow.getByRole("button", { name: "Salvar" }).click();
    await expect(toast(carla, `Presença de ${USERS.jorge.name} registrada: 2h45.`)).toBeVisible();

    // CT08_04 (parte): falta justificada registrada para o Lucas
    const lucasRow = item.locator("li", { hasText: USERS.lucas.name });
    await lucasRow.getByLabel("Falta justificada").check();
    await lucasRow.getByRole("button", { name: "Salvar" }).click();
    await expect(toast(carla, `Falta justificada registrada para ${USERS.lucas.name}.`)).toBeVisible();
  });

  test("CT09_01 / CT10_01 — horas no perfil e emissão do certificado em PDF", async ({ browser }) => {
    const jorge = await loginAs(browser, "jorge");
    await jorge.goto("/profile");
    await expect(jorge.getByRole("heading", { name: "Horas de voluntariado" })).toBeVisible();
    await expect(jorge.getByText(title)).toBeVisible();
    await expect(jorge.locator("li", { hasText: title })).toContainText("Presente");
    await expect(jorge.locator("li", { hasText: title })).toContainText("2h45");

    const [response] = await Promise.all([
      jorge.waitForResponse((r) => r.url().includes("/api/certificates") && r.request().method() === "POST"),
      jorge.getByRole("button", { name: "Emitir certificado" }).click(),
    ]);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.code).toMatch(/^[A-Z0-9]{10}$/);
    expect(body.url).toContain("/storage/v1/object/sign/certificates/");
    code = body.code;

    await expect(jorge.getByRole("status")).toContainText(`Certificado ${code} emitido`);
    await expect(jorge.getByRole("link", { name: /Abrir o PDF/ })).toBeVisible();

    // o PDF existe e é um PDF (link assinado)
    const pdf = await jorge.request.get(body.url);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
  });

  test("CT10_02 — emissão para um período sem presenças", async ({ browser }) => {
    const jorge = await loginAs(browser, "jorge");
    await jorge.goto("/profile");
    await jorge.getByLabel("Certificado: data inicial").fill("2020-01-01");
    await jorge.getByLabel("Certificado: data final").fill("2020-01-31");
    await jorge.getByRole("button", { name: "Emitir certificado" }).click();
    await expect(toast(jorge, "Não há horas registradas neste abrigo no período escolhido.")).toBeVisible();
  });

  test("CT11_01 — validação pública de um código existente (sem login)", async ({ browser }) => {
    test.skip(!code, "depende do certificado emitido no CT10_01");
    const page = await newAnonymousPage(browser); // janela anônima
    await page.goto("/certificates");
    await page.getByLabel("Código do certificado").fill(code);
    await page.getByRole("button", { name: "Validar" }).click();
    await expect(page.getByRole("heading", { name: "Certificado autêntico" })).toBeVisible();
    await expect(page.getByText(USERS.jorge.name)).toBeVisible();
    await expect(page.getByText("Abrigo Esperança")).toBeVisible();
    await expect(page.getByText(/\*\*\*\.\d{3}\.\d{3}-\*\*/)).toBeVisible();
    // sem acesso ao arquivo
    await expect(page.locator('a[href*="storage"]')).toHaveCount(0);
  });

  test("CT11_02 — validação de um código inexistente", async ({ browser }) => {
    const page = await newAnonymousPage(browser);
    await page.goto("/certificates/ZZZZZZZZZZ");
    await expect(page.getByRole("heading", { name: "Certificado não encontrado" })).toBeVisible();
  });
});
