"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { forgotPasswordAction } from "./actions";

const schema = z.object({ email: z.string().email("E-mail inválido") });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      if (result.error) toast.error(result.error);
      else setSent(true);
    });
  };

  if (sent) {
    return (
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h1>
        <p className="text-gray-600">
          Se este endereço estiver cadastrado, enviamos um link para redefinir sua senha.
        </p>
        <Link
          href="/login"
          className="inline-block mt-4 text-blue-600 hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Esqueci minha senha</h1>
        <p className="text-gray-600 mt-1">
          Informe o e-mail cadastrado para receber o link de redefinição.
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">E-mail</label>
        <input
          type="email"
          autoComplete="email"
          {...register("email")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar link"}
      </button>

      <p className="text-sm text-gray-600 text-center">
        <Link href="/login" className="text-blue-600 hover:underline">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
