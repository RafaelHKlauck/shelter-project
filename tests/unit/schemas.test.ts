import { describe, expect, it } from "vitest";
import { attendanceSchema, certificateSchema, shiftFormSchema } from "@/lib/volunteering/schemas";
import { describeNotification } from "@/lib/volunteering/notifications";
import { enrollmentLabel, vacanciesLabel } from "@/lib/volunteering/labels";
import { friendlyError } from "@/lib/volunteering/errors";

const base = {
  title: "Passeio com os cães",
  task_type: "walk" as const,
  description: "",
  date: "2026-11-21",
  start_time: "09:00",
  end_time: "12:00",
  capacity: 3,
  repeat_weekly: false,
  repeat_weeks: 1,
};

const firstError = (r: ReturnType<typeof shiftFormSchema.safeParse>) => (r.success ? null : r.error.issues[0].message);

describe("RN13 no cliente — CT01_02 vagas (0, 1, 20, 21)", () => {
  it.each([1, 20])("%i vagas aceito", (capacity) => {
    expect(shiftFormSchema.safeParse({ ...base, capacity }).success).toBe(true);
  });
  it.each([0, 21])("%i vagas recusado com a mensagem do plano", (capacity) => {
    expect(firstError(shiftFormSchema.safeParse({ ...base, capacity }))).toBe("O número de vagas deve estar entre 1 e 20");
  });
});

describe("RN13 no cliente — CT01_03 duração (59min, 1h, 8h, 8h01)", () => {
  it.each([
    ["09:00", "09:59", false],
    ["09:00", "10:00", true],
    ["09:00", "17:00", true],
    ["09:00", "17:01", false],
  ])("%s–%s → válido=%s", (start_time, end_time, ok) => {
    const r = shiftFormSchema.safeParse({ ...base, start_time, end_time });
    expect(r.success).toBe(ok);
    if (!ok) expect(firstError(r)).toBe("O turno deve durar no mínimo 1 hora e no máximo 8 horas.");
  });
});

describe("RN13 no cliente — CT02_02 recorrência", () => {
  it("12 semanas aceito", () => {
    expect(shiftFormSchema.safeParse({ ...base, repeat_weekly: true, repeat_weeks: 12 }).success).toBe(true);
  });
  it("13 semanas recusado", () => {
    expect(shiftFormSchema.safeParse({ ...base, repeat_weekly: true, repeat_weeks: 13 }).success).toBe(false);
  });
});

describe("Presença e certificado", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  it("entrada sem saída é recusada", () => {
    expect(attendanceSchema.safeParse({ enrollment_id: id, status: "attended", check_in: "09:02", check_out: "" }).success).toBe(false);
  });
  it("presença sem horários vale (duração prevista)", () => {
    expect(attendanceSchema.safeParse({ enrollment_id: id, status: "attended", check_in: "", check_out: "" }).success).toBe(true);
  });
  it("período invertido é recusado", () => {
    expect(certificateSchema.safeParse({ shelter_id: id, from: "2026-11-30", to: "2026-11-01" }).success).toBe(false);
  });
});

describe("RNF10 — situação escrita, não só por cor", () => {
  it("rótulos das inscrições", () => {
    expect(enrollmentLabel("confirmed")).toBe("Inscrito");
    expect(enrollmentLabel("waitlisted", 2)).toBe("Na lista de espera (posição 2)");
    expect(enrollmentLabel("excused")).toBe("Falta justificada");
  });
  it("vagas restantes", () => {
    expect(vacanciesLabel(3, 1, 0)).toBe("2 vagas restantes");
    expect(vacanciesLabel(3, 2, 0)).toBe("1 vaga restante");
    expect(vacanciesLabel(1, 1, 2)).toBe("Lotado · lista de espera 2/5");
    expect(vacanciesLabel(1, 1, 5)).toBe("Lotado e lista de espera completa");
  });
});

describe("Notificações do sino", () => {
  it("confirmação traz turno, abrigo, data e horário", () => {
    const t = describeNotification("shift.enrolled", {
      shift_title: "Passeio com os cães",
      shelter_name: "Abrigo Esperança",
      starts_at_label: "21/11/2026 às 09h00",
    });
    expect(t.title).toBe("Inscrição confirmada: Passeio com os cães");
    expect(t.body).toBe("Abrigo Esperança · 21/11/2026 às 09h00");
  });
  it("bloqueio informa a data de término", () => {
    expect(describeNotification("volunteer.blocked", { shelter_name: "Abrigo Esperança", blocked_until_label: "16/12/2026" }).body)
      .toContain("16/12/2026");
  });
});

describe("Mensagens de erro", () => {
  it("erros de regra (P0001) vão direto para a tela", () => {
    expect(friendlyError({ code: "P0001", message: "O turno deve começar no futuro." })).toBe("O turno deve começar no futuro.");
  });
  it("erros internos não vazam detalhes", () => {
    expect(friendlyError({ code: "23505", message: "duplicate key value violates unique constraint" })).not.toContain("duplicate");
  });
});
