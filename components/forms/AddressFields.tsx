"use client";

import { useState } from "react";
import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { fetchCep, formatZip } from "@/lib/validation/zip";

export type AddressValues = {
  address_zip: string;
  address_line: string;
  address_number?: string | null;
  address_city: string;
  address_state: string;
};

export function AddressFields<
  T extends AddressValues = AddressValues,
>({
  register,
  errors,
  setValue,
}: {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
}) {
  const [loadingCep, setLoadingCep] = useState(false);

  const onZipBlur = async (raw: string) => {
    const formatted = formatZip(raw);
    setValue("address_zip" as never, formatted as never, {
      shouldValidate: true,
    });
    if (formatted.replace(/\D/g, "").length !== 8) return;
    setLoadingCep(true);
    try {
      const result = await fetchCep(formatted);
      if (result) {
        setValue("address_line" as never, result.logradouro as never);
        setValue("address_city" as never, result.localidade as never);
        setValue("address_state" as never, result.uf as never);
      }
    } finally {
      setLoadingCep(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = errors as any;

  return (
    <div className="grid sm:grid-cols-6 gap-4">
      <div className="sm:col-span-2 space-y-1">
        <label className="block text-sm font-medium text-gray-700">CEP</label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          {...register("address_zip" as never)}
          onBlur={(ev) => onZipBlur(ev.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {loadingCep && (
          <p className="text-xs text-gray-500">Buscando endereço…</p>
        )}
        {e.address_zip && (
          <p className="text-sm text-red-600">{e.address_zip.message}</p>
        )}
      </div>

      <div className="sm:col-span-4 space-y-1">
        <label className="block text-sm font-medium text-gray-700">Rua</label>
        <input
          type="text"
          {...register("address_line" as never)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {e.address_line && (
          <p className="text-sm text-red-600">{e.address_line.message}</p>
        )}
      </div>

      <div className="sm:col-span-2 space-y-1">
        <label className="block text-sm font-medium text-gray-700">Número</label>
        <input
          type="text"
          {...register("address_number" as never)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="sm:col-span-3 space-y-1">
        <label className="block text-sm font-medium text-gray-700">Cidade</label>
        <input
          type="text"
          {...register("address_city" as never)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {e.address_city && (
          <p className="text-sm text-red-600">{e.address_city.message}</p>
        )}
      </div>

      <div className="sm:col-span-1 space-y-1">
        <label className="block text-sm font-medium text-gray-700">UF</label>
        <input
          type="text"
          maxLength={2}
          {...register("address_state" as never)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {e.address_state && (
          <p className="text-sm text-red-600">{e.address_state.message}</p>
        )}
      </div>
    </div>
  );
}
