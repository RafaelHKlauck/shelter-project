import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export const metadata = { title: "Validar certificado — AdotaPet" };

async function verify(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
  redirect(`/certificates/${code || "-"}`);
}

/** UC11 — página pública para informar o código do certificado (RF38). */
export default function CertificatesPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-blue-600" aria-hidden />
          Validar certificado
        </h1>
        <p className="text-gray-600 mb-6">
          Informe o código de 10 caracteres que aparece no rodapé do certificado de horas de voluntariado.
        </p>
        <form action={verify} className="flex flex-col sm:flex-row gap-3">
          <label className="sr-only" htmlFor="code">
            Código do certificado
          </label>
          <input
            id="code"
            name="code"
            required
            maxLength={10}
            autoComplete="off"
            placeholder="Ex.: K7M2Q9XA4B"
            className="flex-1 min-h-12 rounded-xl border border-gray-300 px-4 text-lg uppercase tracking-widest font-mono"
          />
          <button type="submit" className="min-h-12 px-6 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700">
            Validar
          </button>
        </form>
      </div>
    </div>
  );
}
