"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { AddressFields } from "@/components/forms/AddressFields";
import { onboardShelterAction } from "./actions";

const schema = z.object({
  name: z.string().min(2, "Informe o nome do abrigo"),
  phone: z.string().min(8, "Informe um telefone"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  description: z.string().optional(),
  needs_supplies: z.boolean(),
  address_line: z.string().min(2, "Informe a rua"),
  address_city: z.string().min(2, "Informe a cidade"),
  address_state: z.string().length(2, "UF com 2 letras"),
  address_zip: z.string().refine((v) => v.replace(/\D/g, "").length === 8, "CEP inválido"),
});

type FormValues = z.infer<typeof schema>;

export function ShelterOnboardingForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { needs_supplies: false },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await onboardShelterAction(values);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 p-8 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cadastre seu abrigo</h1>
        <p className="text-gray-600 mt-1">
          Após criar, você será o administrador e poderá publicar animais,
          suprimentos necessários e gerenciar solicitações.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-gray-700">Nome do abrigo</label>
          <input
            type="text"
            {...register("name")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input
            type="tel"
            placeholder="(51) 9 8765-4321"
            {...register("phone")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            E-mail <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="email"
            {...register("email")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Descrição <span className="text-gray-400">(opcional)</span>
          </label>
          <textarea
            rows={3}
            {...register("description")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-2">
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
          Precisa de suprimentos no momento
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Criando abrigo..." : "Criar abrigo"}
      </button>
    </form>
  );
}
