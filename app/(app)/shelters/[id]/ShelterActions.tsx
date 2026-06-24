"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Users, Truck, Check } from "lucide-react";
import { toast } from "sonner";
import {
  createSupplyRequestsAction,
  createVolunteerRequestAction,
} from "./actions";

type Supply = {
  id: string;
  title: string;
};

export function ShelterActions({
  shelterId,
  shelterName,
  isAuthenticated,
  needsSupplies,
  supplies,
}: {
  shelterId: string;
  shelterName: string;
  isAuthenticated: boolean;
  needsSupplies: boolean;
  supplies: Supply[];
}) {
  const router = useRouter();
  const [openVolunteer, setOpenVolunteer] = useState(false);
  const [openSupplies, setOpenSupplies] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);

  const ensureAuth = () => {
    if (isAuthenticated) return true;
    router.push(`/login?next=/shelters/${shelterId}`);
    return false;
  };

  const onVolunteer = () => {
    if (!ensureAuth()) return;
    startTransition(async () => {
      const result = await createVolunteerRequestAction({
        shelter_id: shelterId,
      });
      if (result.error) toast.error(result.error);
      else setSubmitted(true);
    });
  };

  const onSupplies = () => {
    if (!ensureAuth()) return;
    if (selected.length === 0) {
      toast.error("Selecione ao menos um item");
      return;
    }
    startTransition(async () => {
      const result = await createSupplyRequestsAction({
        shelter_id: shelterId,
        supply_ids: selected,
      });
      if (result.error) toast.error(result.error);
      else setSubmitted(true);
    });
  };

  const closeAll = () => {
    setOpenVolunteer(false);
    setOpenSupplies(false);
    setSubmitted(false);
    setSelected([]);
  };

  return (
    <>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => (ensureAuth() ? setOpenVolunteer(true) : null)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Users className="w-5 h-5" />
          Candidatar-se como Voluntário
        </button>

        {needsSupplies && supplies.length > 0 && (
          <button
            onClick={() => (ensureAuth() ? setOpenSupplies(true) : null)}
            className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Truck className="w-5 h-5" />
            Doar Suprimentos
          </button>
        )}
      </div>

      {openVolunteer && (
        <Modal onClose={closeAll}>
          {submitted ? (
            <Success
              title="Solicitação Enviada!"
              description="O abrigo receberá sua solicitação e entrará em contato em breve."
              onClose={closeAll}
            />
          ) : (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Candidatar-se como Voluntário
              </h3>
              <p className="text-gray-600 mb-6">
                Você está se candidatando para ser voluntário no{" "}
                <strong>{shelterName}</strong>. Eles receberão sua solicitação e
                entrarão em contato.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeAll}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onVolunteer}
                  disabled={pending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
                >
                  {pending ? "Enviando..." : "Confirmar"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {openSupplies && (
        <Modal onClose={closeAll}>
          {submitted ? (
            <Success
              title="Doação Registrada!"
              description="Em breve o abrigo entrará em contato para combinar a entrega."
              onClose={closeAll}
            />
          ) : (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Doar Suprimentos
              </h3>
              <p className="text-gray-600 mb-4">
                Selecione os itens que você pode doar para o{" "}
                <strong>{shelterName}</strong>:
              </p>
              <div className="space-y-2 mb-6 max-h-72 overflow-auto">
                {supplies.map((s) => {
                  const checked = selected.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setSelected((prev) =>
                            e.target.checked
                              ? [...prev, s.id]
                              : prev.filter((p) => p !== s.id),
                          )
                        }
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-900">{s.title}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeAll}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onSupplies}
                  disabled={pending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-60"
                >
                  {pending ? "Enviando..." : "Confirmar Doação"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Success({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <button
        onClick={onClose}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Fechar
      </button>
    </div>
  );
}
