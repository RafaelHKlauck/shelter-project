"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { X } from "lucide-react";
import {
  SIZE_OPTIONS,
  SPECIES_OPTIONS,
} from "@/lib/format/animals";
import {
  createAnimalAction,
  deleteAnimalAction,
  updateAnimalAction,
  type AnimalValues,
} from "./actions";

const schema = z.object({
  shelter_id: z.string().uuid(),
  name: z.string().optional().nullable(),
  species: z.enum(["dog", "cat", "other"]),
  breed: z.string().optional().nullable(),
  is_srd: z.boolean(),
  size: z.enum(["small", "medium", "large"]),
  estimated_age_months: z.coerce.number().int().min(0, "Idade inválida"),
  neutered: z.boolean(),
  health_notes: z.string().optional().nullable(),
  temperament_text: z.string().optional().nullable(),
  cover_url: z.string().url("URL inválida").optional().or(z.literal("")).nullable(),
  status: z.enum(["available", "reserved", "adopted", "unavailable"]),
});

type FormValues = z.infer<typeof schema>;

export function AnimalForm({
  shelterId,
  initial,
}: {
  shelterId: string;
  initial?: {
    id: string;
    name: string | null;
    species: "dog" | "cat" | "other";
    breed: string | null;
    size: "small" | "medium" | "large";
    estimated_age_months: number;
    neutered: boolean;
    health_notes: string | null;
    temperament: string[] | null;
    cover_url: string | null;
    status: "available" | "reserved" | "adopted" | "unavailable";
  };
}) {
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shelter_id: shelterId,
      name: initial?.name ?? "",
      species: initial?.species ?? "dog",
      breed: initial?.breed ?? "",
      is_srd: !initial?.breed,
      size: initial?.size ?? "medium",
      estimated_age_months: initial?.estimated_age_months ?? 12,
      neutered: initial?.neutered ?? false,
      health_notes: initial?.health_notes ?? "",
      temperament_text: (initial?.temperament ?? []).join(", "),
      cover_url: initial?.cover_url ?? "",
      status: initial?.status ?? "available",
    },
  });

  const isSrd = watch("is_srd");

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const payload: AnimalValues = {
        shelter_id: values.shelter_id,
        name: values.name,
        species: values.species,
        breed: values.is_srd ? null : values.breed,
        size: values.size,
        estimated_age_months: values.estimated_age_months,
        neutered: values.neutered,
        health_notes: values.health_notes,
        temperament: values.temperament_text
          ? values.temperament_text
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : null,
        cover_url: values.cover_url,
        status: values.status,
      };
      const result = isEdit
        ? await updateAnimalAction(initial!.id, payload)
        : await createAnimalAction(payload);
      if (result?.error) toast.error(result.error);
    });
  };

  const onDelete = () => {
    if (!initial) return;
    if (!confirm(`Remover ${initial.name ?? "este animal"}?`)) return;
    startTransition(async () => {
      const result = await deleteAnimalAction(initial.id);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl bg-white rounded-xl border border-gray-200 p-8 space-y-5"
    >
      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? "Editar Animal" : "Novo Animal"}
      </h1>

      <input type="hidden" {...register("shelter_id")} />

      <Field label="Nome (opcional)">
        <input
          {...register("name")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Espécie">
          <select
            {...register("species")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SPECIES_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Porte">
          <select
            {...register("size")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Raça">
        <input
          {...register("breed")}
          disabled={isSrd}
          placeholder={isSrd ? "Sem raça definida" : "Ex.: Labrador mix"}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <label className="flex items-center gap-2 mt-2 text-sm text-gray-700">
          <input
            type="checkbox"
            {...register("is_srd")}
            onChange={(e) => {
              setValue("is_srd", e.target.checked);
              if (e.target.checked) setValue("breed", "");
            }}
            className="w-4 h-4 text-blue-600"
          />
          Sem raça definida (SRD)
        </label>
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Idade estimada (meses)"
          error={errors.estimated_age_months?.message}
        >
          <input
            type="number"
            min="0"
            step="1"
            {...register("estimated_age_months")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="Status">
          <select
            {...register("status")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="available">Disponível</option>
            <option value="reserved">Reservado</option>
            <option value="adopted">Adotado</option>
            <option value="unavailable">Indisponível</option>
          </select>
        </Field>
      </div>

      <Field label="Temperamento (separe por vírgula)">
        <input
          {...register("temperament_text")}
          placeholder="Amigável, brincalhão, calmo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field label="Doenças / observações de saúde">
        <textarea
          rows={2}
          {...register("health_notes")}
          placeholder="Nenhuma"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field
        label="URL da imagem (opcional)"
        error={errors.cover_url?.message}
      >
        <input
          {...register("cover_url")}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          {...register("neutered")}
          className="w-4 h-4 text-blue-600"
        />
        Castrado
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {pending
            ? "Salvando..."
            : isEdit
              ? "Salvar alterações"
              : "Cadastrar animal"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="flex items-center gap-1 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm"
          >
            <X className="w-4 h-4" />
            Remover
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
