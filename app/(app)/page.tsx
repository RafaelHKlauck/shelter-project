import Link from "next/link";
import { PawPrint, Heart, Users, Truck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          Encontre seu novo melhor amigo
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Conectamos pessoas e animais que precisam de um lar
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/animals"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Ver Animais Disponíveis
          </Link>
          <Link
            href="/shelters"
            className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Conhecer Abrigos
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <FeatureCard
          icon={PawPrint}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          title="Adote um Animal"
          description="Encontre o companheiro perfeito para você"
        />
        <FeatureCard
          icon={Users}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          title="Seja Voluntário"
          description="Ajude abrigos com seu tempo e dedicação"
        />
        <FeatureCard
          icon={Truck}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          title="Doe Suprimentos"
          description="Contribua com ração, cobertores e mais"
        />
        <FeatureCard
          icon={Heart}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
          title="Faça a Diferença"
          description="Cada adoção salva uma vida"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Como funciona?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Step
            n={1}
            title="Busque e Filtre"
            description="Encontre animais por tipo, porte, idade e distância do abrigo"
          />
          <Step
            n={2}
            title="Candidate-se"
            description="Envie sua solicitação de adoção para o abrigo responsável"
          />
          <Step
            n={3}
            title="Combine a Entrega"
            description="Após aprovação, converse com o abrigo para buscar seu novo amigo"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
      <div
        className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function Step({
  n,
  title,
  description,
}: {
  n: number;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-3">
        {n}
      </div>
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
