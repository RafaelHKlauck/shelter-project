"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { TASK_OPTIONS } from "@/lib/volunteering/labels";
import { shiftFormSchema, type ShiftFormInput, type ShiftFormValues } from "@/lib/volunteering/schemas";
import { todayLocal } from "@/lib/volunteering/time";
import { createShiftAction, updateShiftAction } from "../schedule-actions";

const input =
  "w-full min-h-11 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500";
const label = "block text-sm font-medium text-gray-700 mb-1";

/** Cadastro (RF27/RF29) e edição (RF28) de turnos. */
export function ShiftForm({
  shelterId,
  shiftId,
  defaultValues,
  onDone,
}: {
  shelterId: string;
  shiftId?: string;
  defaultValues?: Partial<ShiftFormInput>;
  onDone?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const editing = Boolean(shiftId);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ShiftFormInput, unknown, ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      title: "",
      task_type: "walk",
      description: "",
      date: "",
      start_time: "09:00",
      end_time: "12:00",
      capacity: 3,
      repeat_weekly: false,
      repeat_weeks: 4,
      ...defaultValues,
    },
  });

  const repeat = watch("repeat_weekly");

  const onSubmit = (values: ShiftFormValues) => {
    startTransition(async () => {
      if (editing) {
        const r = await updateShiftAction(shiftId!, values);
        if (r?.error) return void toast.error(r.error, { duration: 8000 });
        toast.success("Turno atualizado.");
      } else {
        const r = await createShiftAction(shelterId, values);
        if (r.error) return void toast.error(r.error, { duration: 8000 });
        toast.success(r.created && r.created > 1 ? `${r.created} turnos criados.` : "Turno criado.");
        reset({ ...values, title: "", description: "" });
      }
      onDone?.();
    });
  };

  const err = (msg?: string) => (msg ? <p className="text-sm text-red-700 mt-1">{msg}</p> : null);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label} htmlFor={`title-${shiftId ?? "new"}`}>Título</label>
          <input id={`title-${shiftId ?? "new"}`} className={input} placeholder="Ex.: Passeio com os cães" {...register("title")} />
          {err(errors.title?.message)}
        </div>
        <div>
          <label className={label} htmlFor={`task-${shiftId ?? "new"}`}>Tipo de tarefa</label>
          <select id={`task-${shiftId ?? "new"}`} className={input} {...register("task_type")}>
            {TASK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label} htmlFor={`cap-${shiftId ?? "new"}`}>Número de vagas (1 a 20)</label>
          <input id={`cap-${shiftId ?? "new"}`} type="number" min={1} max={20} className={input} {...register("capacity")} />
          {err(errors.capacity?.message)}
        </div>
        <div>
          <label className={label} htmlFor={`date-${shiftId ?? "new"}`}>Data</label>
          <input id={`date-${shiftId ?? "new"}`} type="date" min={todayLocal()} className={input} {...register("date")} />
          {err(errors.date?.message)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor={`st-${shiftId ?? "new"}`}>Início</label>
            <input id={`st-${shiftId ?? "new"}`} type="time" className={input} {...register("start_time")} />
            {err(errors.start_time?.message)}
          </div>
          <div>
            <label className={label} htmlFor={`et-${shiftId ?? "new"}`}>Término</label>
            <input id={`et-${shiftId ?? "new"}`} type="time" className={input} {...register("end_time")} />
          </div>
          <div className="col-span-2">{err(errors.end_time?.message)}</div>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor={`desc-${shiftId ?? "new"}`}>Descrição (opcional)</label>
          <textarea id={`desc-${shiftId ?? "new"}`} rows={2} className={`${input} py-2`} {...register("description")} />
        </div>
      </div>

      {!editing && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-3">
          <label className="flex items-center gap-3 text-base min-h-11">
            <input type="checkbox" className="w-5 h-5" {...register("repeat_weekly")} />
            Repetir toda semana
          </label>
          {repeat && (
            <div className="max-w-xs">
              <label className={label} htmlFor="repeat-weeks">Por quantas semanas (2 a 12)</label>
              <input id="repeat-weeks" type="number" min={2} max={12} className={input} {...register("repeat_weeks")} />
              {err(errors.repeat_weeks?.message)}
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-gray-500">Horários de Brasília. O turno deve durar de 1 a 8 horas e começar no futuro.</p>

      <div className="flex flex-wrap gap-3 justify-end">
        {onDone && editing && (
          <button type="button" onClick={onDone} className="min-h-11 px-4 rounded-lg border border-gray-300 hover:bg-gray-50">
            Fechar
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar turno"}
        </button>
      </div>
    </form>
  );
}
