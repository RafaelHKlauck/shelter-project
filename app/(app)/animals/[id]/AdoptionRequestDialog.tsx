"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart, Check } from "lucide-react";
import { toast } from "sonner";
import { createAdoptionRequestAction } from "./actions";

export function AdoptionRequestDialog({
  animalId,
  animalName,
  shelterName,
  isAuthenticated,
  isAvailable,
}: {
  animalId: string;
  animalName: string;
  shelterName: string;
  isAuthenticated: boolean;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const onOpen = () => {
    if (!isAuthenticated) {
      router.push(`/login?next=/animals/${animalId}`);
      return;
    }
    setOpen(true);
  };

  const onSubmit = () => {
    startTransition(async () => {
      const result = await createAdoptionRequestAction({ animal_id: animalId });
      if (result.error) toast.error(result.error);
      else setSubmitted(true);
    });
  };

  const onClose = () => {
    setOpen(false);
    setSubmitted(false);
  };

  return (
    <>
      <button
        onClick={onOpen}
        disabled={!isAvailable}
        className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <Heart className="w-5 h-5" />
        {isAvailable ? "Candidatar-se à Adoção" : "Indisponível"}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Solicitação Enviada!
                </h3>
                <p className="text-gray-600 mb-6">
                  O abrigo receberá sua solicitação e entrará em contato em
                  breve.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Candidatar-se à Adoção
                </h3>
                <p className="text-gray-600 mb-6">
                  Você está prestes a se candidatar para adotar{" "}
                  <strong>{animalName}</strong>. O abrigo {shelterName} receberá
                  sua solicitação e analisará seu perfil.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={onSubmit}
                    disabled={pending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    {pending ? "Enviando..." : "Confirmar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
