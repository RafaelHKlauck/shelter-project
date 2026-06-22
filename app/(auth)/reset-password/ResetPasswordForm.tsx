"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { resetPasswordAction } from "./actions";

const schema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Senhas não conferem",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await resetPasswordAction({ password: values.password });
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
        <p className="text-gray-600 mt-1">Defina uma nova senha para sua conta.</p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Nova senha</label>
        <input
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Confirmar</label>
        <input
          type="password"
          autoComplete="new-password"
          {...register("confirm")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.confirm && (
          <p className="text-sm text-red-600">{errors.confirm.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
