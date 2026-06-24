"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { addSupplyAction, deleteSupplyAction } from "./actions";

type Supply = {
  id: string;
  title: string;
  quantity_target: number | null;
  quantity_fulfilled: number;
  unit: string | null;
  status: string;
};

export function SuppliesEditor({
  shelterId,
  supplies,
}: {
  shelterId: string;
  supplies: Supply[];
}) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [pending, startTransition] = useTransition();

  const onAdd = () => {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await addSupplyAction({
        shelter_id: shelterId,
        title: title.trim(),
        quantity_target: target ? Number(target) : null,
        unit: unit || null,
      });
      if (result?.error) toast.error(result.error);
      else {
        setTitle("");
        setTarget("");
        setUnit("");
        toast.success("Item adicionado.");
      }
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteSupplyAction({ id, shelter_id: shelterId });
      if (result?.error) toast.error(result.error);
      else toast.success("Item removido.");
    });
  };

  return (
    <div className="space-y-4 pt-6 border-t border-gray-200">
      <h2 className="text-xl font-bold text-gray-900">Suprimentos Necessários</h2>

      <div className="flex flex-wrap gap-2">
        {supplies.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-2 pl-3 pr-2 py-1 bg-orange-50 border border-orange-200 text-orange-900 rounded-full text-sm"
          >
            {s.title}
            {s.quantity_target != null && (
              <span className="text-orange-700/70">
                ({s.quantity_fulfilled}/{s.quantity_target}
                {s.unit ? ` ${s.unit}` : ""})
              </span>
            )}
            <button
              onClick={() => onDelete(s.id)}
              disabled={pending}
              type="button"
              className="rounded-full p-0.5 hover:bg-orange-100"
              aria-label="Remover"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {supplies.length === 0 && (
          <span className="text-sm text-gray-500">
            Nenhum suprimento cadastrado.
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-6 space-y-1">
          <label className="block text-sm font-medium text-gray-700">Item</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Ração para cachorro"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-3 space-y-1">
          <label className="block text-sm font-medium text-gray-700">Quantidade</label>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            type="number"
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="block text-sm font-medium text-gray-700">Unidade</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="kg/un"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-1">
          <button
            type="button"
            onClick={onAdd}
            disabled={pending}
            className="w-full flex items-center justify-center px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
