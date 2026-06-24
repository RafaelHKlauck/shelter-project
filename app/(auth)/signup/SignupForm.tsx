"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { signupAction } from "./actions";

type Intent = "default" | "shelter";

const schema = z
  .object({
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Senhas não conferem",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function SignupForm({ intent = "default" }: { intent?: Intent }) {
  const [pending, startTransition] = useTransition();
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const result = await signupAction({
        email: values.email,
        password: values.password,
        intent,
      });
      if (result?.error) toast.error(result.error);
      else if (result?.needsConfirm) setNeedsConfirm(true);
    });
  };

  if (needsConfirm) {
    return (
      <div className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Confirme seu e-mail
        </h1>
        <p className="text-gray-600">
          Enviamos um link de confirmação para o seu e-mail. Clique nele para
          ativar sua conta e continuar o cadastro.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md bg-white rounded-xl border border-gray-200 p-8 space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {intent === "shelter" ? "Cadastrar meu abrigo" : "Criar conta"}
        </h1>
        <p className="text-gray-600 mt-1">
          {intent === "shelter"
            ? "Primeiro crie sua conta de administrador. Em seguida pediremos os dados do seu abrigo."
            : "Cadastre-se e encontre seu novo melhor amigo."}
        </p>
      </div>

      <Field
        label="E-mail"
        error={errors.email?.message}
        input={
          <input
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        }
      />

      <Field
        label="Senha"
        error={errors.password?.message}
        input={
          <input
            type="password"
            autoComplete="new-password"
            {...register("password")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        }
      />

      <Field
        label="Confirmar senha"
        error={errors.confirm?.message}
        input={
          <input
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        }
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar conta"}
      </button>

      <p className="text-sm text-gray-600 text-center">
        Já tem conta?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {input}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
