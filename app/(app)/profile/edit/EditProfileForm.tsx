"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { Home, Building2 } from "lucide-react";
import { AddressFields } from "@/components/forms/AddressFields";
import { updateProfileAction } from "./actions";

const schema = z.object({
  full_name: z.string().min(2, "Informe seu nome"),
  birth_date: z.string().min(1, "Informe a data"),
  housing_type: z.enum(["house", "apartment"]),
  address_line: z.string().min(2, "Informe a rua"),
  address_number: z.string().optional().nullable(),
  address_city: z.string().min(2, "Informe a cidade"),
  address_state: z.string().length(2, "UF com 2 letras"),
  address_zip: z.string().refine((v) => v.replace(/\D/g, "").length === 8, "CEP inválido"),
  avatar_url: z.string().url("URL inválida").optional().or(z.literal("")).nullable(),
});

type FormValues = z.infer<typeof schema>;

export function EditProfileForm({ defaultValues }: { defaultValues: FormValues }) {
  const [pending, startTransition] = useTransition();
  const [addressChanged, setAddressChanged] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const housing = watch("housing_type");

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await updateProfileAction({
        ...values,
        regeocode: addressChanged,
      });
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-2xl bg-white rounded-xl border border-gray-200 p-8 space-y-5"
    >
      <h1 className="text-2xl font-bold text-gray-900">Editar perfil</h1>

      <Field label="Nome completo" error={errors.full_name?.message}>
        <input
          type="text"
          {...register("full_name")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <Field label="Data de nascimento" error={errors.birth_date?.message}>
        <input
          type="date"
          {...register("birth_date")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Tipo de moradia
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Option
            label="Casa"
            icon={Home}
            checked={housing === "house"}
            onSelect={() => setValue("housing_type", "house")}
          />
          <Option
            label="Apartamento"
            icon={Building2}
            checked={housing === "apartment"}
            onSelect={() => setValue("housing_type", "apartment")}
          />
        </div>
      </div>

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

      <Field
        label="URL da foto de perfil (opcional)"
        error={errors.avatar_url?.message}
      >
        <input
          {...register("avatar_url")}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Option({
  label,
  icon: Icon,
  checked,
  onSelect,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
        checked
          ? "bg-blue-50 border-blue-500 text-blue-700"
          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
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
