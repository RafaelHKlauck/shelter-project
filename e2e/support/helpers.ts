import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/types";
import { IS_PROD, PASSWORD, SHELTERS, SUPABASE_KEY, SUPABASE_URL, USERS, type UserKey } from "./env";

type Client = SupabaseClient<Database>;

// ---------- Preparação de dados pela API (mesmas funções RPC que o app usa) ----------

const clients = new Map<UserKey, Client>();

export async function api(user: UserKey): Promise<Client> {
  const cached = clients.get(user);
  if (cached) return cached;
  const c = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await c.auth.signInWithPassword({ email: USERS[user].email, password: PASSWORD });
  if (error) throw new Error(`login ${USERS[user].email}: ${error.message}`);
  clients.set(user, c);
  return c;
}

export async function shelterId(name: keyof typeof SHELTERS): Promise<string> {
  const c = await api("carla");
  const { data, error } = await c.from("shelters").select("id").eq("name", SHELTERS[name]).single();
  if (error) throw error;
  return data.id;
}

/** Identificador desta execução, para títulos únicos (ex.: "CT04_01 · m3k9x"). */
export const RUN = Date.now().toString(36).slice(-5);

/**
 * Dia base desta execução, entre 20 e 59 dias no futuro (dentro da janela da aba Escala),
 * variando por execução para não colidir com turnos de execuções anteriores (RN07).
 */
const BASE_DAY_OFFSET = 20 + (Math.floor(Date.now() / 60_000) % 40);

export function futureDay(extraDays = 0): string {
  const d = new Date(Date.now() + (BASE_DAY_OFFSET + extraDays) * 86_400_000);
  // data em Brasília (UTC-3)
  return new Date(d.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
}

/** Data/hora de Brasília → ISO. Ex.: at("2026-12-20", "09:00") */
export function at(date: string, time: string): string {
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

type Created = { id: string; by: UserKey };
const created: Created[] = [];

export async function createShift(opts: {
  by?: UserKey;
  shelter?: keyof typeof SHELTERS;
  title: string;
  startsAt: string;
  endsAt: string;
  capacity?: number;
  task?: Database["public"]["Enums"]["shift_task"];
}): Promise<string> {
  const by = opts.by ?? "carla";
  const c = await api(by);
  const { data, error } = await c.rpc("create_shift", {
    p_shelter_id: await shelterId(opts.shelter ?? "esperanca"),
    p_title: opts.title,
    p_task_type: opts.task ?? "walk",
    p_description: "Criado pelo teste E2E",
    p_starts_at: opts.startsAt,
    p_ends_at: opts.endsAt,
    p_capacity: opts.capacity ?? 3,
  });
  if (error) throw new Error(`create_shift: ${error.message}`);
  created.push({ id: data![0].id, by });
  return data![0].id;
}

export async function enroll(user: UserKey, shiftId: string) {
  const { data, error } = await (await api(user)).rpc("enroll_in_shift", { p_shift_id: shiftId });
  if (error) throw new Error(`enroll ${user}: ${error.message}`);
  return data as { status: string; waitlist_position: number | null; enrollment_id: string };
}

export async function enrollmentsOf(shiftId: string) {
  const { data } = await (await api("carla"))
    .from("shift_enrollments")
    .select("user_id, status, waitlist_position")
    .eq("shift_id", shiftId);
  return data ?? [];
}

export function trackShift(id: string, by: UserKey = "carla") {
  created.push({ id, by });
}

/** Cancela os turnos criados pelo teste (as inscrições viram "cancelled"). */
export async function cleanup() {
  while (created.length) {
    const s = created.pop()!;
    await (await api(s.by)).rpc("cancel_shift", { p_shift_id: s.id }).then(() => undefined, () => undefined);
  }
}

// ---------- Interface ----------

// O Supabase Auth limita os logins por IP (30 a cada 5 minutos no projeto publicado).
// Cada teste entra pela tela com uma sessão própria; em produção, o helper espera quando
// a execução se aproxima do limite, em vez de estourá-lo. No local o limite foi ampliado
// em supabase/config.toml ([auth.rate_limit] sign_in_sign_ups).
const LOGIN_LIMIT = IS_PROD ? 25 : 1000;
const LOGIN_WINDOW_MS = 5 * 60_000;
const logins: number[] = [];

async function respectLoginLimit(page: Page) {
  const now = Date.now();
  while (logins.length && now - logins[0] > LOGIN_WINDOW_MS) logins.shift();
  if (logins.length >= LOGIN_LIMIT) {
    const wait = LOGIN_WINDOW_MS - (now - logins[0]) + 1_000;
    console.log(`[e2e] aguardando ${Math.ceil(wait / 1000)} s pelo limite de logins do Supabase`);
    await page.waitForTimeout(wait);
  }
  logins.push(Date.now());
}

const openContexts: BrowserContext[] = [];

/** Fecha, ao fim de cada teste, os navegadores abertos por ele (relatório mais limpo). */
export function closeContextsAfterEach() {
  test.afterEach(async () => {
    while (openContexts.length) await openContexts.pop()!.close().catch(() => undefined);
  });
}

export async function newAnonymousPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  openContexts.push(context);
  return context.newPage();
}

export async function loginAs(browser: Browser, user: UserKey): Promise<Page> {
  const context = await browser.newContext();
  openContexts.push(context);
  const page = await context.newPage();
  await loginOn(page, user);
  return page;
}

export async function loginOn(page: Page, user: UserKey) {
  await respectLoginLimit(page);
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(USERS[user].email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 });
}

export function agendaCard(page: Page, title: string) {
  return page.locator('section[aria-labelledby="agenda-title"] li', { hasText: title });
}

export function myShift(page: Page, title: string) {
  return page.locator('section[aria-labelledby="my-shifts-title"] li', { hasText: title });
}

export async function openAgenda(page: Page, date: string) {
  await page.goto(`/volunteering?view=week&date=${date}`);
  await expect(page.getByRole("heading", { name: "Agenda de voluntariado" })).toBeVisible();
}

export async function openScheduleTab(page: Page) {
  await page.goto("/shelter-dashboard");
  await page.getByRole("button", { name: "Escala", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Indicadores da escala" })).toBeVisible();
}

export async function expandManagedShift(page: Page, title: string) {
  const item = page.locator('section[aria-labelledby="shifts-title"] li', { hasText: title }).first();
  await item.locator("button[aria-expanded]").first().click();
  return item;
}

export function toast(page: Page, text: string | RegExp) {
  return page.locator("[data-sonner-toast]", { hasText: text }).first();
}
