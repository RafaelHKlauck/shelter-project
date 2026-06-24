"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function SheltersFilters({ hasLocation }: { hasLocation: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [maxKm, setMaxKm] = useState(Number(params.get("maxKm") ?? "20"));

  const push = (next: { q?: string; maxKm?: number }) => {
    const sp = new URLSearchParams(params);
    if ("q" in next) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    if ("maxKm" in next && next.maxKm != null) sp.set("maxKm", String(next.maxKm));
    startTransition(() => {
      router.push(`/shelters?${sp.toString()}`);
    });
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      if (q !== (params.get("q") ?? "")) push({ q });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar abrigo por nome ou localização..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {hasLocation
            ? `Distância Máxima: ${maxKm} km`
            : "Distância (indisponível sem perfil)"}
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={maxKm}
          disabled={!hasLocation}
          onChange={(e) => setMaxKm(Number(e.target.value))}
          onMouseUp={() => push({ maxKm })}
          onTouchEnd={() => push({ maxKm })}
          className="w-full disabled:opacity-50"
        />
      </div>
    </div>
  );
}
