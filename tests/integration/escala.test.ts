/**
 * Testes de integração contra o Supabase LOCAL (supabase start + supabase db reset).
 * Cobrem o que não dá para testar dentro de uma única transação do pgTAP:
 *   CT04_06  duas sessões disputando a última vaga ao mesmo tempo (RNF08)
 *   CT03_02  atualização das vagas em tempo real em outra sessão (RNF14)
 *   RNF09    RLS pela API pública (PostgREST), com usuários reais autenticados
 *   RNF11    tempo de resposta da inscrição/cancelamento
 * Se o Supabase local não estiver no ar, os testes são pulados.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const URL = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
// chave publicável padrão do `supabase start` (só serve para o ambiente local)
const KEY = process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const PASSWORD = "adota123"; // senha de teste do supabase/seed.sql
const ESPERANCA = "aaaaaaaa-0000-0000-0000-000000000001";

type Client = SupabaseClient<Database>;

async function login(email: string): Promise<Client> {
  const c = createClient<Database>(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

const reachable = await fetch(`${URL}/auth/v1/health`, { headers: { apikey: KEY } })
  .then((r) => r.ok)
  .catch(() => false);

describe.skipIf(!reachable)("Escala de voluntariado — integração", () => {
  let carla: Client, jorge: Client, lucas: Client, maria: Client;
  const created: string[] = [];

  beforeAll(async () => {
    [carla, jorge, lucas, maria] = await Promise.all([
      login("admin@esperanca.test"),
      login("jorge@adotapet.test"),
      login("lucas@adotapet.test"),
      login("voluntaria@adotapet.test"),
    ]);
    await warmUpRealtime();
  }, 60_000);

  // Logo depois de um `supabase db reset` o Realtime local leva alguns segundos para voltar
  // a entregar eventos. Espera o primeiro evento chegar antes de medir a latência (CT03_02).
  async function warmUpRealtime() {
    const shiftId = await newShift(20, 20, "Aquecimento do Realtime");
    let got = false;
    const ch = maria
      .channel(`warmup-${shiftId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "volunteer_shifts", filter: `id=eq.${shiftId}` }, () => {
        got = true;
      })
      .subscribe();
    const deadline = Date.now() + 45_000;
    let enrollment: string | null = null;
    while (!got && Date.now() < deadline) {
      if (enrollment) {
        await jorge.rpc("cancel_enrollment", { p_enrollment_id: enrollment });
        enrollment = null;
      } else {
        const { data } = await jorge.rpc("enroll_in_shift", { p_shift_id: shiftId });
        enrollment = (data as { enrollment_id: string } | null)?.enrollment_id ?? null;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (enrollment) await jorge.rpc("cancel_enrollment", { p_enrollment_id: enrollment });
    await maria.removeChannel(ch);
  }

  afterAll(async () => {
    // cancela os turnos criados (as inscrições viram cancelled e não geram conflito na próxima execução)
    for (const id of created) await carla.rpc("cancel_shift", { p_shift_id: id });
  });

  // horários distantes e únicos por execução para não colidir com outras inscrições (RN07)
  const slot = (i: number) => {
    const base = Date.now() + (40 + (Math.floor(Date.now() / 1000) % 200)) * 24 * 3600 * 1000;
    const start = new Date(Math.floor(base / 3_600_000) * 3_600_000 + i * 2 * 3_600_000);
    return { start: start.toISOString(), end: new Date(start.getTime() + 3_600_000).toISOString() };
  };

  async function newShift(i: number, capacity: number, title: string) {
    const { start, end } = slot(i);
    const { data, error } = await carla.rpc("create_shift", {
      p_shelter_id: ESPERANCA,
      p_title: title,
      p_task_type: "cleaning",
      p_description: "",
      p_starts_at: start,
      p_ends_at: end,
      p_capacity: capacity,
    });
    if (error) throw error;
    const id = data![0].id;
    created.push(id);
    return id;
  }

  it("CT04_06 — duas pessoas disputando a última vaga: só uma é confirmada (5 repetições)", async () => {
    for (let i = 0; i < 5; i++) {
      const shiftId = await newShift(i, 1, `CT04_06 Limpeza dos canis #${i + 1}`);
      const [a, b] = await Promise.all([
        jorge.rpc("enroll_in_shift", { p_shift_id: shiftId }),
        lucas.rpc("enroll_in_shift", { p_shift_id: shiftId }),
      ]);
      expect(a.error).toBeNull();
      expect(b.error).toBeNull();
      const statuses = [a.data, b.data].map((d) => (d as { status: string }).status).sort();
      expect(statuses).toEqual(["confirmed", "waitlisted"]);
      const loser = [a.data, b.data].find((d) => (d as { status: string }).status === "waitlisted") as {
        waitlist_position: number;
      };
      expect(loser.waitlist_position).toBe(1);

      const { data: rows } = await carla.from("shift_enrollments").select("status").eq("shift_id", shiftId);
      expect(rows!.map((r) => r.status).sort()).toEqual(["confirmed", "waitlisted"]);
      const { data: shift } = await carla.from("volunteer_shifts").select("confirmed_count, capacity").eq("id", shiftId).single();
      expect(shift!.confirmed_count).toBeLessThanOrEqual(shift!.capacity);
    }
  });

  it("CT03_02 — inscrição em uma sessão atualiza as vagas na outra em até 3 segundos", async () => {
    const shiftId = await newShift(12, 3, "CT03_02 Realtime");
    // mede do momento da inscrição até o evento chegar (RNF14); a assinatura do canal
    // pode demorar mais logo depois de um reset do banco, que reinicia o Realtime
    const received = new Promise<number>((resolve, reject) => {
      let t0 = 0;
      const timeout = setTimeout(() => reject(new Error("sem evento")), 15_000);
      const ch = maria
        .channel(`test-${shiftId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "volunteer_shifts", filter: `id=eq.${shiftId}` },
          (payload) => {
            const row = payload.new as { confirmed_count: number };
            if (row.confirmed_count === 1 && t0) {
              clearTimeout(timeout);
              maria.removeChannel(ch);
              resolve(Date.now() - t0);
            }
          },
        )
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await new Promise((r) => setTimeout(r, 500));
            t0 = Date.now();
            await jorge.rpc("enroll_in_shift", { p_shift_id: shiftId });
          }
        });
    });
    const ms = await received;
    expect(ms).toBeLessThan(3000);
  });

  it("RNF09 — pela API, o voluntário só enxerga as próprias inscrições e não escreve direto nas tabelas", async () => {
    const { data: mine } = await jorge.from("shift_enrollments").select("user_id");
    const { data: me } = await jorge.auth.getUser();
    expect(mine!.every((r) => r.user_id === me.user!.id)).toBe(true);

    const ins = await jorge.from("volunteer_shifts").insert({
      shelter_id: ESPERANCA,
      title: "hack",
      starts_at: slot(30).start,
      ends_at: slot(30).end,
      capacity: 20,
    });
    expect(ins.error).not.toBeNull();

    const anon = createClient<Database>(URL, KEY, { auth: { persistSession: false } });
    const { data: anonShifts } = await anon.from("volunteer_shifts").select("id");
    expect(anonShifts ?? []).toHaveLength(0);
    const verify = await anon.rpc("verify_certificate", { p_code: "ZZZZZZZZZZ" });
    expect(verify.error).toBeNull(); // visitante pode validar
    expect(verify.data).toHaveLength(0);
  });

  it("RNF11 — inscrição e cancelamento respondem em até 1 segundo", async () => {
    const shiftId = await newShift(16, 5, "RNF11 Tempo de resposta");
    let t = performance.now();
    const enroll = await maria.rpc("enroll_in_shift", { p_shift_id: shiftId });
    expect(performance.now() - t).toBeLessThan(1000);
    expect(enroll.error).toBeNull();
    t = performance.now();
    const cancel = await maria.rpc("cancel_enrollment", {
      p_enrollment_id: (enroll.data as { enrollment_id: string }).enrollment_id,
    });
    expect(performance.now() - t).toBeLessThan(1000);
    expect(cancel.error).toBeNull();
  });
});
