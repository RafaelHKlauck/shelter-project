import { MapPin, Home, Building2 } from "lucide-react";
import { RequestActions } from "./RequestActions";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200";

type RequesterProfile = {
  id: string;
  full_name: string;
  cpf_encrypted: string | null;
  birth_date: string;
  address_line: string;
  address_city: string;
  address_state: string;
  housing_type: "house" | "apartment";
  avatar_url: string | null;
};

export type RequestRow = {
  id: string;
  kind: "adoption" | "volunteer" | "supply";
  status: "pending" | "accepted" | "rejected" | "finalized" | "cancelled";
  created_at: string;
  message: string | null;
  requester_id: string;
  animal_name: string | null;
  supply_title: string | null;
  requester: RequesterProfile | null;
};

const KIND_LABEL: Record<RequestRow["kind"], string> = {
  adoption: "Adoção",
  volunteer: "Voluntariado",
  supply: "Doação de Suprimentos",
};

const KIND_BADGE: Record<RequestRow["kind"], string> = {
  adoption: "bg-blue-50 text-blue-700",
  volunteer: "bg-green-50 text-green-700",
  supply: "bg-orange-50 text-orange-700",
};

function calcAge(birth: string): number {
  const b = new Date(birth);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function RequestsTab({
  shelterId,
  pending,
  approved,
}: {
  shelterId: string;
  pending: RequestRow[];
  approved: RequestRow[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Solicitações Pendentes
      </h2>

      {pending.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Nenhuma solicitação pendente no momento.
        </p>
      ) : (
        pending.map((r) => (
          <PendingCard key={r.id} request={r} shelterId={shelterId} />
        ))
      )}

      {approved.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-4 mt-8">
            Aprovações Ativas
          </h2>
          {approved.map((r) => (
            <ApprovedRow key={r.id} request={r} shelterId={shelterId} />
          ))}
        </>
      )}
    </div>
  );
}

function PendingCard({
  request,
  shelterId,
}: {
  request: RequestRow;
  shelterId: string;
}) {
  const p = request.requester;
  const housingLabel =
    p?.housing_type === "house"
      ? "Casa"
      : p?.housing_type === "apartment"
        ? "Apartamento"
        : "—";

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex gap-4 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p?.avatar_url ?? FALLBACK_AVATAR}
          alt={p?.full_name ?? "Solicitante"}
          className="w-16 h-16 rounded-full object-cover"
        />

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900">
              {p?.full_name ?? "Solicitante"}
            </h3>
            <span
              className={`px-2 py-1 text-xs rounded-full ${KIND_BADGE[request.kind]}`}
            >
              {KIND_LABEL[request.kind]}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(request.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>

          {request.kind === "adoption" && request.animal_name && (
            <p className="text-sm text-gray-600 mb-2">
              Quer adotar: <strong>{request.animal_name}</strong>
            </p>
          )}

          {request.kind === "supply" && request.supply_title && (
            <p className="text-sm text-gray-600 mb-2">
              Quer doar: <strong>{request.supply_title}</strong>
            </p>
          )}

          {p && (
            <div className="text-sm text-gray-600 space-y-1">
              {p.cpf_encrypted && <p>CPF: {p.cpf_encrypted}</p>}
              <p>Idade: {calcAge(p.birth_date)} anos</p>
              <p className="flex items-start gap-1">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                <span>
                  {p.address_line}, {p.address_city} - {p.address_state}
                </span>
              </p>
              <p className="flex items-center gap-1">
                {p.housing_type === "house" ? (
                  <Home className="w-4 h-4 text-gray-400" />
                ) : (
                  <Building2 className="w-4 h-4 text-gray-400" />
                )}
                <span>Tipo de moradia: {housingLabel}</span>
              </p>
            </div>
          )}

          {request.message && (
            <p className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              <span className="font-medium">Mensagem:</span> {request.message}
            </p>
          )}
        </div>
      </div>

      <RequestActions
        requestId={request.id}
        requesterId={request.requester_id}
        requesterName={p?.full_name ?? "Solicitante"}
        shelterId={shelterId}
        showHistory
        variant="pending"
      />
    </div>
  );
}

function ApprovedRow({
  request,
  shelterId,
}: {
  request: RequestRow;
  shelterId: string;
}) {
  const p = request.requester;
  return (
    <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p?.avatar_url ?? FALLBACK_AVATAR}
          alt={p?.full_name ?? "Solicitante"}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <p className="font-bold text-gray-900">
            {p?.full_name ?? "Solicitante"}
          </p>
          <p className="text-sm text-gray-600">
            {request.kind === "supply"
              ? `Doação aprovada${request.supply_title ? ` — ${request.supply_title}` : ""}`
              : request.kind === "volunteer"
                ? "Voluntariado aprovado"
                : `Adoção aprovada${request.animal_name ? ` — ${request.animal_name}` : ""}`}
          </p>
        </div>
      </div>

      <RequestActions
        requestId={request.id}
        requesterId={request.requester_id}
        requesterName={p?.full_name ?? "Solicitante"}
        shelterId={shelterId}
        showHistory={false}
        variant="accepted"
      />
    </div>
  );
}
