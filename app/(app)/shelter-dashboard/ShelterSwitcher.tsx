"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ShelterSwitcher({
  current,
  shelters,
}: {
  current: string;
  shelters: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  if (shelters.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Abrigo:</label>
      <select
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("shelter", e.target.value);
          router.push(`/shelter-dashboard?${next.toString()}`);
        }}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {shelters.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
