import { describe, expect, it } from "vitest";
import {
  agendaRange,
  agendaTitle,
  attendanceWindowOpen,
  canSelfCancel,
  dayKey,
  formatDateTime,
  localToUtcIso,
  minutesToLabel,
  moveAgenda,
  utcToLocalParts,
} from "@/lib/volunteering/time";

describe("RNF13 — horário de Brasília", () => {
  it("converte data/hora local para UTC (UTC-3)", () => {
    expect(localToUtcIso("2026-11-21", "09:00")).toBe("2026-11-21T12:00:00.000Z");
    expect(localToUtcIso("2026-11-21", "23:30")).toBe("2026-11-22T02:30:00.000Z");
  });

  it("faz o caminho inverso para preencher formulários", () => {
    expect(utcToLocalParts("2026-11-21T12:00:00.000Z")).toEqual({ date: "2026-11-21", time: "09:00" });
    expect(utcToLocalParts("2026-11-22T02:30:00.000Z")).toEqual({ date: "2026-11-21", time: "23:30" });
  });

  it("formata e agrupa pelo dia de Brasília, não pelo do aparelho", () => {
    expect(formatDateTime("2026-11-22T02:30:00.000Z")).toBe("21/11/2026 às 23h30");
    expect(dayKey("2026-11-22T02:30:00.000Z")).toBe("2026-11-21");
  });

  it("recusa entrada inválida", () => {
    expect(() => localToUtcIso("21/11/2026", "09:00")).toThrow();
    expect(() => localToUtcIso("2026-11-21", "25:00")).toThrow();
  });
});

describe("Agenda semanal e mensal (RF30)", () => {
  it("semana vai de segunda 00h a segunda seguinte 00h", () => {
    // 21/11/2026 é sábado → semana de 16/11 a 22/11
    expect(agendaRange("week", "2026-11-21")).toEqual({
      from: "2026-11-16T03:00:00.000Z",
      to: "2026-11-23T03:00:00.000Z",
    });
    expect(agendaTitle("week", "2026-11-21")).toBe("16/11 a 22/11/2026");
  });

  it("mês cobre do dia 1 ao último dia", () => {
    expect(agendaRange("month", "2026-11-21")).toEqual({
      from: "2026-11-01T03:00:00.000Z",
      to: "2026-12-01T03:00:00.000Z",
    });
    expect(agendaTitle("month", "2026-11-21")).toBe("Novembro de 2026");
  });

  it("navega para o período anterior e o próximo", () => {
    expect(moveAgenda("week", "2026-11-21", 1)).toBe("2026-11-28");
    expect(moveAgenda("month", "2026-11-21", -1)).toBe("2026-10-21");
  });
});

describe("RN12 — rótulo de horas", () => {
  it.each([
    [165, "2h45"],
    [180, "3h"],
    [300, "5h"],
    [645, "10h45"],
    [0, "0h"],
  ])("%i minutos → %s", (min, label) => {
    expect(minutesToLabel(min)).toBe(label);
  });
});

describe("RN09 — exibição do botão de cancelar (valor limite)", () => {
  const start = "2026-11-21T12:00:00.000Z";
  it("12h10 antes: pode cancelar", () => {
    expect(canSelfCancel(start, new Date("2026-11-20T23:50:00.000Z"))).toBe(true);
  });
  it("exatamente 12h antes: pode cancelar", () => {
    expect(canSelfCancel(start, new Date("2026-11-21T00:00:00.000Z"))).toBe(true);
  });
  it("11h50 antes: não pode", () => {
    expect(canSelfCancel(start, new Date("2026-11-21T00:10:00.000Z"))).toBe(false);
  });
});

describe("RN15 — janela de presença", () => {
  const s = "2026-11-21T12:00:00.000Z";
  const e = "2026-11-21T15:00:00.000Z";
  it("antes do início: fechada", () => expect(attendanceWindowOpen(s, e, new Date("2026-11-21T11:59:00.000Z"))).toBe(false));
  it("no início: aberta", () => expect(attendanceWindowOpen(s, e, new Date(s))).toBe(true));
  it("7 dias após o término: aberta", () => expect(attendanceWindowOpen(s, e, new Date("2026-11-28T15:00:00.000Z"))).toBe(true));
  it("8 dias após o término: fechada", () => expect(attendanceWindowOpen(s, e, new Date("2026-11-29T15:00:00.000Z"))).toBe(false));
});
