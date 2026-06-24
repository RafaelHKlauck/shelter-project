"use client";

import { useState, type ReactNode } from "react";

type TabKey = "requests" | "animals" | "team" | "info";

export function DashboardTabs({
  requests,
  animals,
  info,
  team,
  initial = "requests",
}: {
  requests: ReactNode;
  animals: ReactNode;
  info: ReactNode;
  team?: ReactNode;
  initial?: TabKey;
}) {
  const [active, setActive] = useState<TabKey>(initial);

  const tab = (key: TabKey, label: string) => (
    <button
      key={key}
      onClick={() => setActive(key)}
      className={`px-6 py-4 font-medium transition-colors ${
        active === key
          ? "text-blue-600 border-b-2 border-blue-600"
          : "text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200">
        <div className="flex">
          {tab("requests", "Solicitações")}
          {tab("animals", "Animais")}
          {team && tab("team", "Equipe")}
          {tab("info", "Informações")}
        </div>
      </div>
      <div className="p-6">
        {active === "requests" && requests}
        {active === "animals" && animals}
        {active === "team" && team}
        {active === "info" && info}
      </div>
    </div>
  );
}
