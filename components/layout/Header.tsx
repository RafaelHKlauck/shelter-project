"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PawPrint,
  Building2,
  User,
  MessageSquare,
  LayoutDashboard,
  LogIn,
  LogOut,
} from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const PUBLIC_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Início", icon: Home, exact: true },
  { href: "/animals", label: "Animais", icon: PawPrint },
  { href: "/shelters", label: "Abrigos", icon: Building2 },
];

const AUTH_ITEMS: readonly NavItem[] = [
  { href: "/messages", label: "Mensagens", icon: MessageSquare },
  { href: "/profile", label: "Perfil", icon: User },
];

const SHELTER_ITEM: NavItem = {
  href: "/shelter-dashboard",
  label: "Painel",
  icon: LayoutDashboard,
};

export function Header({
  isLoggedIn,
  isShelterMember,
}: {
  isLoggedIn: boolean;
  isShelterMember: boolean;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const items: NavItem[] = [...PUBLIC_ITEMS];
  if (isLoggedIn) {
    items.push(AUTH_ITEMS[0]); // Mensagens
    if (isShelterMember) items.push(SHELTER_ITEM);
    items.push(AUTH_ITEMS[1]); // Perfil
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <PawPrint className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">AdotaPet</span>
          </Link>

          <nav className="flex items-center gap-1">
            {items.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            {isLoggedIn ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  aria-label="Sair"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors ml-2"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
