"use client";

import { useTransition } from "react";
import { Award, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { removeMemberAction, setMemberRoleAction } from "./team-actions";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200";

export type Member = {
  user_id: string;
  role: "admin" | "editor" | "volunteer";
  full_name: string;
  avatar_url: string | null;
  is_me: boolean;
};

const ROLE_LABEL: Record<Member["role"], string> = {
  admin: "Administrador",
  editor: "Editor",
  volunteer: "Voluntário",
};

const ROLE_BADGE: Record<Member["role"], string> = {
  admin: "bg-blue-50 text-blue-700",
  editor: "bg-purple-50 text-purple-700",
  volunteer: "bg-green-50 text-green-700",
};

export function TeamTab({
  shelterId,
  isAdmin,
  members,
}: {
  shelterId: string;
  isAdmin: boolean;
  members: Member[];
}) {
  const [pending, startTransition] = useTransition();

  const updateRole = (m: Member, role: Member["role"], label: string) => {
    startTransition(async () => {
      const result = await setMemberRoleAction({
        shelter_id: shelterId,
        user_id: m.user_id,
        role,
      });
      if (result?.error) toast.error(result.error);
      else toast.success(label);
    });
  };

  const remove = (m: Member) => {
    if (
      !confirm(
        `Remover ${m.full_name} da equipe do abrigo? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await removeMemberAction({
        shelter_id: shelterId,
        user_id: m.user_id,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Membro removido.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-gray-900">Equipe do Abrigo</h2>
        <span className="text-sm text-gray-500">
          {members.length} {members.length === 1 ? "pessoa" : "pessoas"}
        </span>
      </div>

      {members.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Nenhum membro além de você.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center gap-4 p-4 flex-wrap"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.avatar_url ?? FALLBACK_AVATAR}
                alt={m.full_name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900">
                    {m.full_name}
                    {m.is_me && (
                      <span className="ml-2 text-xs text-gray-500">(você)</span>
                    )}
                  </p>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${ROLE_BADGE[m.role]}`}
                  >
                    {ROLE_LABEL[m.role]}
                  </span>
                  {m.role === "volunteer" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                      <Award className="w-3 h-3" />
                      Badge ativo
                    </span>
                  )}
                </div>
              </div>

              {isAdmin && !m.is_me && (
                <div className="flex items-center gap-2">
                  {m.role === "volunteer" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRole(m, "editor", "Promovido a editor")
                      }
                      disabled={pending}
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-60"
                    >
                      <ChevronUp className="w-4 h-4" />
                      Promover a editor
                    </button>
                  )}
                  {m.role === "editor" && (
                    <button
                      type="button"
                      onClick={() =>
                        updateRole(m, "volunteer", "Rebaixado a voluntário")
                      }
                      disabled={pending}
                      className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-60"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Voltar a voluntário
                    </button>
                  )}
                  {m.role !== "admin" && (
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      disabled={pending}
                      className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remover
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
