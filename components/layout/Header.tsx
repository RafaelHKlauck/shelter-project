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
  CalendarDays,
} from "lucide-react";
import { signOutAction } from "@/app/(app)/actions";
import { NotificationBell } from "./NotificationBell";

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

const VOLUNTEER_ITEM: NavItem = {
  href: "/volunteering",
  label: "Voluntariado",
  icon: CalendarDays,
};

const SHELTER_ITEM: NavItem = {
  href: "/shelter-dashboard",
  label: "Painel",
  icon: LayoutDashboard,
};

export function Header({
  userId,
  isShelterMember,
  isVolunteer,
}: {
  userId: string | null;
  isShelterMember: boolean;
  isVolunteer: boolean;
}) {
  const pathname = usePathname();
  const isLoggedIn = Boolean(userId);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const items: NavItem[] = [...PUBLIC_ITEMS];
  if (isLoggedIn) {
    items.push(AUTH_ITEMS[0]); // Mensagens
    if (isVolunteer) items.push(VOLUNTEER_ITEM);
    if (isShelterMember) items.push(SHELTER_ITEM);
    items.push(AUTH_ITEMS[1]); // Perfil
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <PawPrint className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 hidden md:inline">AdotaPet</span>
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {items.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 lg:px-4 py-2 min-h-11 rounded-lg transition-colors ${exact ? "hidden sm:flex " : ""}${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              );
            })}

            {userId && <NotificationBell userId={userId} />}

            {isLoggedIn ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-2.5 sm:px-4 py-2 min-h-11 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
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
