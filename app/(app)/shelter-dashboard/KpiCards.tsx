import { PawPrint, Clock, CheckCircle } from "lucide-react";

export function KpiCards({
  animals,
  pending,
  approved,
}: {
  animals: number;
  pending: number;
  approved: number;
}) {
  return (
    <div className="grid sm:grid-cols-3 gap-4 mb-8">
      <Kpi
        icon={PawPrint}
        bg="bg-blue-100"
        color="text-blue-600"
        value={animals}
        label="Animais cadastrados"
      />
      <Kpi
        icon={Clock}
        bg="bg-orange-100"
        color="text-orange-600"
        value={pending}
        label="Solicitações pendentes"
      />
      <Kpi
        icon={CheckCircle}
        bg="bg-green-100"
        color="text-green-600"
        value={approved}
        label="Aprovações ativas"
      />
    </div>
  );
}

function Kpi({
  icon: Icon,
  bg,
  color,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}
