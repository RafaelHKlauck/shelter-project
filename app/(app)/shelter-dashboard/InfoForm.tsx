"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { AddressFields } from "@/components/forms/AddressFields";
import { updateShelterAction } from "./actions";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, "Informe o nome"),
  phone: z.string().min(8, "Informe um telefone"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
  description: z.string().optional().nullable(),
  needs_supplies: z.boolean(),
  cover_url: z.string().url("URL inválida").optional().or(z.literal("")).nullable(),
  address_line: z.string().min(2),
  address_city: z.string().min(2),
  address_state: z.string().length(2),
  address_zip: z.string().refine((v) => v.replace(/\D/g, "").length === 8, "CEP inválido"),
});

type FormValues = z.infer<typeof schema>;

export function InfoForm({
  defaultValues,
}: {
  defaultValues: FormValues;
}) {
  const [pending, startTransition] = useTransition();
  const [addressChanged, setAddressChanged] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await updateShelterAction({
        ...values,
        regeocode: addressChanged,
      });
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Informações salvas.");
        setAddressChanged(false);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Informações do Abrigo</h2>

      <input type="hidden" {...register("id")} />

      <Field label="Nome do Abrigo" error={errors.name?.message}>
        <input
          {...register("name")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Telefone" error={errors.phone?.message}>
          <input
            {...register("phone")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="E-mail" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
      </div>

      <Field label="Descrição">
        <textarea
          rows={4}
          {...register("description")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field
        label="URL da imagem de capa (opcional)"
        error={errors.cover_url?.message}
      >
        <input
          {...register("cover_url")}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <div
        className="space-y-2"
        onChange={() => setAddressChanged(true)}
      >
        <label className="block text-sm font-medium text-gray-700">Endereço</label>
        <AddressFields<FormValues>
          register={register}
          errors={errors}
          setValue={setValue}
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          {...register("needs_supplies")}
          className="w-4 h-4 text-blue-600"
        />
        <span className="text-sm font-medium text-gray-700">
          Precisa de suprimentos
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar Alterações"}
      </button>
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
