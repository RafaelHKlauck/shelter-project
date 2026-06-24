"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { loginAction } from "./actions";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await loginAction(values);
      if (result?.error) toast.error(result.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo de volta. Entre com seu e-mail e senha.
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

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
        <input
          type="password"
          autoComplete="current-password"
          {...register("password")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-sm text-gray-600 text-center">
        Não tem conta?{" "}
        <Link href="/signup" className="text-blue-600 hover:underline">
          Criar conta
        </Link>
      </p>

      <div className="-mx-8 -mb-8 mt-2 px-8 py-5 bg-blue-50 border-t border-blue-100 rounded-b-xl">
        <p className="text-sm text-gray-700">
          <strong className="text-blue-900">É um abrigo?</strong> Crie uma conta
          e cadastre seu abrigo para receber adoções, voluntários e doações.
        </p>
        <Link
          href="/signup?next=shelter"
          className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline"
        >
          Cadastrar meu abrigo →
        </Link>
      </div>
    </form>
  );
}
