import { expect, test } from "@playwright/test";
import { loginAs, closeContextsAfterEach } from "./support/helpers";

closeContextsAfterEach();

test.describe("RNF10 — Usabilidade no celular (360 px)", () => {
  test("CT03_04 — agenda em tela de 360 px: sem rolagem horizontal, botões de 44 px e situação escrita", async ({ browser }) => {
    const jorge = await loginAs(browser, "jorge");
    await jorge.setViewportSize({ width: 360, height: 800 });
    await jorge.goto("/volunteering");
    await expect(jorge.getByRole("heading", { name: "Agenda de voluntariado" })).toBeVisible();

    const { scrollWidth, clientWidth } = await jorge.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth, "sem rolagem horizontal").toBeLessThanOrEqual(clientWidth);

    const small = await jorge.evaluate(() =>
      [...document.querySelectorAll("main button, main select")]
        .filter((b) => (b as HTMLElement).offsetParent !== null && b.getBoundingClientRect().height < 44)
        .map((b) => b.textContent?.trim()),
    );
    expect(small, "botões com menos de 44 px").toEqual([]);

    const fontSize = await jorge.evaluate(() => getComputedStyle(document.querySelector("main p")!).fontSize);
    expect(fontSize).toBe("16px");

    await jorge.screenshot({ path: "test-results/agenda-360px.png", fullPage: true });
  });
});
