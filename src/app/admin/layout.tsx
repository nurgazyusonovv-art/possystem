"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Tag,
  QrCode,
  Home,
  Users,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RequireRole } from "@/components/RequireRole";
import { UserChip } from "@/components/UserChip";

const NAV = [
  { href: "/admin", label: "Отчёт", icon: LayoutDashboard, exact: true },
  { href: "/admin/categories", label: "Категориялар", icon: Tag },
  { href: "/admin/products", label: "Товарлар", icon: UtensilsCrossed },
  { href: "/admin/history", label: "Заказ тарыхы", icon: History },
  { href: "/admin/tables", label: "Столдор / QR", icon: QrCode },
  { href: "/admin/staff", label: "Кызматкерлер", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <RequireRole roles={["admin"]}>
    <div className="flex-1 flex">
      <aside className="w-16 sm:w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2">
            <LayoutDashboard className="size-5 text-primary" />
          </div>
          <span className="font-semibold hidden sm:block">Админ панел</span>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((n) => {
            const active = n.exact
              ? pathname === n.href
              : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="hidden sm:block">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-border space-y-2">
          <div className="px-1 hidden sm:block">
            <UserChip />
          </div>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <Home className="size-5 shrink-0" />
            <span className="hidden sm:block">Башкы бет</span>
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
    </RequireRole>
  );
}
