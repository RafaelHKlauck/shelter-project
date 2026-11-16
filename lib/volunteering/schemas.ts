import { z } from "zod/v3";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Formulário de turno (RF27/RF29) com as validações da RN13 também no cliente,
 * para retorno imediato. O banco valida de novo (fonte de verdade).
 * Turnos não atravessam a meia-noite (máximo de 8 horas no mesmo dia).
 */
export const shiftFormSchema = z
  .object({
    title: z.string().trim().min(2, "Informe um título com pelo menos 2 caracteres.").max(120),
    task_type: z.enum(["walk", "cleaning", "care", "event", "other"]),
    description: z.string().max(2000).optional().or(z.literal("")),
    date: z.string().regex(DATE, "Informe a data."),
    start_time: z.string().regex(TIME, "Informe o horário de início."),
    end_time: z.string().regex(TIME, "Informe o horário de término."),
    capacity: z.coerce
      .number({ invalid_type_error: "O número de vagas deve estar entre 1 e 20" })
      .int("O número de vagas deve estar entre 1 e 20")
      .min(1, "O número de vagas deve estar entre 1 e 20")
      .max(20, "O número de vagas deve estar entre 1 e 20"),
    repeat_weekly: z.boolean().default(false),
    repeat_weeks: z.coerce.number().int().min(1).max(12, "A recorrência semanal deve ser de 1 a 12 semanas.").default(1),
  })
  .superRefine((v, ctx) => {
    if (!TIME.test(v.start_time) || !TIME.test(v.end_time)) return;
    const duration = minutesOf(v.end_time) - minutesOf(v.start_time);
    if (duration < 60 || duration > 480) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_time"],
        message: "O turno deve durar no mínimo 1 hora e no máximo 8 horas.",
      });
    }
    if (v.repeat_weekly && (v.repeat_weeks < 2 || v.repeat_weeks > 12)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repeat_weeks"],
        message: "A recorrência semanal deve ser de 2 a 12 semanas.",
      });
    }
  });

export type ShiftFormInput = z.input<typeof shiftFormSchema>;
export type ShiftFormValues = z.output<typeof shiftFormSchema>;

export const attendanceSchema = z
  .object({
    enrollment_id: z.string().uuid(),
    status: z.enum(["attended", "absent", "excused"]),
    check_in: z.string().regex(TIME).optional().or(z.literal("")),
    check_out: z.string().regex(TIME).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.status !== "attended") return;
    if (!!v.check_in !== !!v.check_out) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["check_out"],
        message: "Informe o horário de entrada e o de saída, ou deixe os dois em branco.",
      });
    }
  });

export const certificateSchema = z
  .object({
    shelter_id: z.string().uuid("Escolha o abrigo."),
    from: z.string().regex(DATE, "Informe a data inicial."),
    to: z.string().regex(DATE, "Informe a data final."),
  })
  .refine((v) => v.to >= v.from, { path: ["to"], message: "Informe um período válido." });
