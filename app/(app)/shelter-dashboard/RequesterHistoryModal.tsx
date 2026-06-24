"use client";

import { useEffect, useState } from "react";
import { X, PawPrint, Users, Truck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type HistoryRow = {
  request_id: string;
  shelter_id: string;
  shelter_name: string;
  kind: "adoption" | "volunteer" | "supply";
  status: "pending" | "accepted" | "rejected" | "finalized" | "cancelled";
  animal_name: string | null;
  decided_at: string | null;
  finalized_at: string | null;
  created_at: string;
};

const KIND_ICON: Record<HistoryRow["kind"], React.ComponentType<{ className?: string }>> = {
  adoption: PawPrint,
  volunteer: Users,
  supply: Truck,
};

const KIND_LABEL: Record<HistoryRow["kind"], string> = {
  adoption: "Adoção",
  volunteer: "Voluntariado",
  supply: "Doação",
};

const STATUS_LABEL: Record<HistoryRow["status"], string> = {
  pending: "Pendente",
  accepted: "Aprovada",
  rejected: "Recusada",
  finalized: "Finalizada",
  cancelled: "Cancelada",
};

export function RequesterHistoryModal({
  open,
  onClose,
  requesterId,
  excludeShelterId,
  requesterName,
}: {
  open: boolean;
  onClose: () => void;
  requesterId: string;
  excludeShelterId: string;
  requesterName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const supabase = createClient();
    supabase
      .rpc("get_requester_history", {
        p_requester_id: requesterId,
        p_exclude_shelter_id: excludeShelterId,
      })
      .then(({ data }) => {
        setRows((data ?? []) as HistoryRow[]);
        setLoading(false);
      });
  }, [open, requesterId, excludeShelterId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Histórico do solicitante</h3>
            <p className="text-sm text-gray-600">{requesterName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-8">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Sem histórico em outros abrigos.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const Icon = KIND_ICON[r.kind];
              return (
                <div
                  key={r.request_id}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <p className="font-medium text-gray-900">{r.shelter_name}</p>
                    <span className="ml-auto text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {KIND_LABEL[r.kind]}
                    {r.animal_name ? ` • ${r.animal_name}` : ""}{" "}
                    <span className="ml-1 text-gray-500">
                      ({STATUS_LABEL[r.status]})
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
