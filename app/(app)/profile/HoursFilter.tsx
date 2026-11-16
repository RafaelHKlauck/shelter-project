"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Filtro por período das horas e do histórico (RF36). */
export function HoursFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  const apply = (nf: string, nt: string) => {
    const p = new URLSearchParams();
    if (nf) p.set("from", nf);
    if (nt) p.set("to", nt);
    router.push(`/profile${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        apply(f, t);
      }}
    >
      <label className="text-sm">
        <span className="block text-gray-700 mb-1">De</span>
        <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="min-h-11 rounded-lg border border-gray-300 px-3" />
      </label>
      <label className="text-sm">
        <span className="block text-gray-700 mb-1">Até</span>
        <input type="date" value={t} onChange={(e) => setT(e.target.value)} className="min-h-11 rounded-lg border border-gray-300 px-3" />
      </label>
      <button type="submit" className="min-h-11 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium">
        Filtrar
      </button>
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            setF("");
            setT("");
            apply("", "");
          }}
          className="min-h-11 px-4 rounded-lg border border-gray-300 text-sm"
        >
          Limpar
        </button>
      )}
    </form>
  );
}
