"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { Home, Building2 } from "lucide-react";
import { formatCPF, isValidCPF } from "@/lib/validation/cpf";
import { AddressFields } from "@/components/forms/AddressFields";
import { onboardProfileAction } from "./actions";

const schema = z.object({
  full_name: z.string().min(2, "Informe seu nome completo"),
  cpf: z.string().refine(isValidCPF, "CPF inválido"),
  birth_date: z.string().min(1, "Informe a data"),
  housing_type: z.enum(["house", "apartment"]),
  address_line: z.string().min(2, "Informe a rua"),
  address_number: z.string().optional(),
  address_city: z.string().min(2, "Informe a cidade"),
  address_state: z.string().length(2, "UF com 2 letras"),
  address_zip: z.string().refine((v) => v.replace(/\D/g, "").length === 8, "CEP inválido"),
});

type FormValues = z.infer<typeof schema>;

export function ProfileOnboardingForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { housing_type: "house" },
  });

  const housing = watch("housing_type");
  const cpf = watch("cpf");

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await onboardProfileAction(values);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 p-8 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Complete seu perfil</h1>
        <p className="text-gray-600 mt-1">
          Precisamos de algumas informações para conectar você aos abrigos mais
          próximos.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Nome completo
          </label>
          <input
            type="text"
            autoComplete="name"
            {...register("full_name")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.full_name && (
            <p className="text-sm text-red-600">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">CPF</label>
          <input
            type="text"
            inputMode="numeric"
            value={cpf ? formatCPF(cpf) : ""}
            onChange={(e) =>
              setValue("cpf", formatCPF(e.target.value), {
                shouldValidate: true,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.cpf && (
            <p className="text-sm text-red-600">{errors.cpf.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Data de nascimento
          </label>
          <input
            type="date"
            {...register("birth_date")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.birth_date && (
            <p className="text-sm text-red-600">{errors.birth_date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Tipo de moradia
        </label>
        <div className="grid grid-cols-2 gap-3">
          <HousingOption
            label="Casa"
            value="house"
            icon={Home}
            checked={housing === "house"}
            onSelect={() => setValue("housing_type", "house")}
          />
          <HousingOption
            label="Apartamento"
            value="apartment"
            icon={Building2}
            checked={housing === "apartment"}
            onSelect={() => setValue("housing_type", "apartment")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Endereço
        </label>
        <AddressFields<FormValues>
          register={register}
          errors={errors}
          setValue={setValue}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Continuar"}
      </button>
    </form>
  );
}

function HousingOption({
  label,
  value,
  icon: Icon,
  checked,
  onSelect,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      data-value={value}
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
