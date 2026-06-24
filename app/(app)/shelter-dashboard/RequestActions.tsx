"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { setRequestStatusAction } from "./actions";
import { RequesterHistoryModal } from "./RequesterHistoryModal";

type Status = "accepted" | "rejected" | "finalized";

export function RequestActions({
  requestId,
  requesterId,
  requesterName,
  shelterId,
  showHistory,
  variant,
}: {
  requestId: string;
  requesterId: string;
  requesterName: string;
  shelterId: string;
  showHistory: boolean;
  variant: "pending" | "accepted";
}) {
  const [pending, startTransition] = useTransition();
  const [historyOpen, setHistoryOpen] = useState(false);

  const update = (status: Status, label: string) => {
    startTransition(async () => {
      const result = await setRequestStatusAction({ id: requestId, status });
      if (result?.error) toast.error(result.error);
      else toast.success(label);
    });
  };

  return (
    <>
      <div className="flex gap-2 justify-end flex-wrap">
        {showHistory && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Ver Histórico
          </button>
        )}

        {variant === "pending" && (
          <>
            <button
              type="button"
              onClick={() => update("rejected", "Solicitação recusada")}
              disabled={pending}
              className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              Rejeitar
            </button>
            <button
              type="button"
              onClick={() => update("accepted", "Solicitação aprovada")}
              disabled={pending}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-60"
            >
              <CheckCircle className="w-4 h-4" />
              Aprovar
            </button>
          </>
        )}

        {variant === "accepted" && (
          <>
            <Link
              href={`/messages?conversation=${requestId}`}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Conversar
            </Link>
            <button
              type="button"
              onClick={() => update("finalized", "Solicitação finalizada")}
              disabled={pending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-60"
            >
              Finalizar
            </button>
          </>
        )}
      </div>

      {showHistory && (
        <RequesterHistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          requesterId={requesterId}
          excludeShelterId={shelterId}
          requesterName={requesterName}
        />
      )}
    </>
  );
}
