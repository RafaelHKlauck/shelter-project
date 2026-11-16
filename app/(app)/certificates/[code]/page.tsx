import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { minutesToLabel, formatDate } from "@/lib/volunteering/time";

export const metadata = { title: "Validação de certificado — AdotaPet" };

function br(date: string) {
  const [y, m, d] = date.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/**
 * UC11 — validação pública. Usa verify_certificate(), que devolve só os dados do
 * certificado: sem acesso ao arquivo e com o CPF mascarado (CT11_01).
 */
export default async function CertificateVerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_certificate", { p_code: decodeURIComponent(code) });
  const cert = data?.[0];

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {cert ? (
        <div className="bg-white border border-green-200 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-7 h-7" aria-hidden />
            Certificado autêntico
          </h1>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-3 text-base">
            <dt className="text-gray-600">Voluntário(a)</dt>
            <dd className="font-semibold text-gray-900">{cert.volunteer_name}</dd>
            {cert.cpf_masked && (
              <>
                <dt className="text-gray-600">CPF</dt>
                <dd className="font-mono">{cert.cpf_masked}</dd>
              </>
            )}
            <dt className="text-gray-600">Abrigo</dt>
            <dd className="font-semibold text-gray-900">{cert.shelter_name}</dd>
            <dt className="text-gray-600">Período</dt>
            <dd>
              {br(cert.period_start)} a {br(cert.period_end)}
            </dd>
            <dt className="text-gray-600">Total de horas</dt>
            <dd className="font-semibold text-gray-900">
              {minutesToLabel(cert.total_minutes)} em {cert.shifts_count} {cert.shifts_count === 1 ? "turno" : "turnos"}
            </dd>
            <dt className="text-gray-600">Emitido em</dt>
            <dd>{formatDate(cert.issued_at)}</dd>
            <dt className="text-gray-600">Código</dt>
            <dd className="font-mono tracking-widest">{cert.code}</dd>
          </dl>
        </div>
      ) : (
        <div className="bg-white border border-red-200 rounded-xl p-6">
          <h1 className="text-2xl font-bold text-red-800 mb-2 flex items-center gap-2">
            <XCircle className="w-7 h-7" aria-hidden />
            Certificado não encontrado
          </h1>
          <p className="text-gray-700">
            Não existe certificado com o código <span className="font-mono">{decodeURIComponent(code)}</span>. Confira se
            o código foi digitado corretamente.
          </p>
        </div>
      )}
      <p className="mt-6 text-center">
        <Link href="/certificates" className="text-blue-700 underline">
          Validar outro código
        </Link>
      </p>
    </div>
  );
}
