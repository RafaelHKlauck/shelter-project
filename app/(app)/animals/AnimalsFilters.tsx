"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

export function AnimalsFilters({
  hasLocation,
}: {
  hasLocation: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);

  const [q, setQ] = useState(params.get("q") ?? "");
  const [species, setSpecies] = useState(params.get("species") ?? "all");
  const [size, setSize] = useState(params.get("size") ?? "all");
  const [maxKm, setMaxKm] = useState(Number(params.get("maxKm") ?? "20"));

  const pushFilters = (next: {
    q?: string;
    species?: string;
    size?: string;
    maxKm?: number;
  }) => {
    const sp = new URLSearchParams(params);
    if ("q" in next) {
      if (next.q) sp.set("q", next.q);
      else sp.delete("q");
    }
    if ("species" in next) {
      if (next.species && next.species !== "all") sp.set("species", next.species);
      else sp.delete("species");
    }
    if ("size" in next) {
      if (next.size && next.size !== "all") sp.set("size", next.size);
      else sp.delete("size");
    }
    if ("maxKm" in next && next.maxKm != null) {
      sp.set("maxKm", String(next.maxKm));
    }
    startTransition(() => {
      router.push(`/animals?${sp.toString()}`);
    });
  };

  // debounce do search
  useEffect(() => {
    const handle = setTimeout(() => {
      if (q !== (params.get("q") ?? "")) pushFilters({ q });
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
            placeholder="Buscar por nome ou raça..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filtros
        </button>
      </div>

      {open && (
        <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Animal
            </label>
            <select
              value={species}
              onChange={(e) => {
                setSpecies(e.target.value);
                pushFilters({ species: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="dog">Cachorro</option>
              <option value="cat">Gato</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porte
            </label>
            <select
              value={size}
              onChange={(e) => {
                setSize(e.target.value);
                pushFilters({ size: e.target.value });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="small">Pequeno</option>
              <option value="medium">Médio</option>
              <option value="large">Grande</option>
            </select>
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
              onMouseUp={() => pushFilters({ maxKm })}
              onTouchEnd={() => pushFilters({ maxKm })}
              className="w-full disabled:opacity-50"
            />
          </div>
        </div>
      )}

      {pending && (
        <p className="text-xs text-gray-400 pt-3">Atualizando resultados…</p>
      )}
    </div>
  );
}
