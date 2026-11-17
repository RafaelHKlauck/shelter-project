"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { minutesToLabel, todayLocal } from "@/lib/volunteering/time";

/** UC10 — escolhe abrigo e período e chama POST /api/certificates. */
export function CertificateForm({ shelters }: { shelters: { id: string; name: string }[] }) {
  const router = useRouter();
  const today = todayLocal();
  const [shelterId, setShelterId] = useState(shelters[0]?.id ?? "");
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [result, setResult] = useState<{ code: string; url: string | null; total: number } | null>(null);
  const [pending, startTransition] = useTransition();

  if (shelters.length === 0) return null;

  const submit = () =>
    startTransition(async () => {
      setResult(null);
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shelter_id: shelterId, from, to }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? "Não foi possível emitir o certificado.", { duration: 8000 });
        return;
      }
      setResult({ code: body.code, url: body.url, total: body.total_minutes });
      toast.success(`Certificado ${body.code} emitido.`);
      router.refresh();
    });

  const input = "min-h-11 rounded-lg border border-gray-300 px-3 text-base";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-gray-700 mb-1">Abrigo</span>
          <select aria-label="Certificado: abrigo" value={shelterId} onChange={(e) => setShelterId(e.target.value)} className={input}>
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-gray-700 mb-1">De</span>
          <input type="date" aria-label="Certificado: data inicial" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={input} />
        </label>
        <label className="text-sm">
          <span className="block text-gray-700 mb-1">Até</span>
          <input type="date" aria-label="Certificado: data final" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={input} />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !shelterId || !from || !to}
          className="min-h-11 px-5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Gerando PDF..." : "Emitir certificado"}
        </button>
      </div>
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-900" role="status">
          <p>
            Certificado <span className="font-mono font-semibold">{result.code}</span> emitido com{" "}
            <strong>{minutesToLabel(result.total)}</strong>.
          </p>
          {result.url && (
            <a href={result.url} target="_blank" rel="noopener" className="inline-block mt-2 underline font-semibold">
              Abrir o PDF (link válido por 1 hora)
            </a>
          )}
        </div>
      )}
    </div>
  );
}
