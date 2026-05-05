"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  ChefHat,
  LayoutGrid,
  UtensilsCrossed,
  Boxes,
  Trash2,
  Users,
  UserRound,
  BarChart3,
  Settings,
  Sparkles,
  ClipboardCheck,
  Bike,
  Shield,
  Ticket,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@dinova/lib/AuthProvider";
import { canAccess, Role } from "@dinova/lib/roles";

export type NavItem = { href: string; label: string; icon: any };

export const NAV_SECTIONS: {
  title: string;
  items: NavItem[];
}[] = [
  {
    title: "Operate",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/waiter", label: "My Section", icon: ClipboardCheck },
      { href: "/delivery", label: "Dispatch", icon: Bike },
      { href: "/orders", label: "Orders", icon: ReceiptText },
      { href: "/kds", label: "Kitchen Display", icon: ChefHat },
      { href: "/tables", label: "Tables", icon: LayoutGrid },
    ],
  },
  {
    title: "Kitchen & Stock",
    items: [
      { href: "/menu", label: "Menu & Recipes", icon: UtensilsCrossed },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/expenses", label: "Expenses & Wastage", icon: Trash2 },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/customers", label: "Customers", icon: UserRound },
    ],
  },
  {
    title: "Insights",
    items: [
      { href: "/promotions", label: "Promotions", icon: Ticket },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/audit", label: "Activity Log", icon: Shield },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function Section({
  title,
  items,
  pathname,
  role,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  role: string | undefined;
}) {
  const visible = items.filter((it) => canAccess(role as Role, it.href));
  if (visible.length === 0) return null;
  return (
    <div className="px-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400 px-3 mb-2 mt-5">
        {title}
      </p>
      <div className="space-y-0.5">
        {visible.map((it) => {
          const active =
            it.href === "/"
              ? pathname === "/"
              : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={clsx("nav-link", active && "nav-link-active")}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const { user } = useAuth();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 shrink-0 flex-col border-r border-ink-200/70 bg-white lg:flex">
      <div className="h-16 px-5 flex items-center gap-2.5 border-b border-ink-200/70">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-ink-200/70">
          <img
            src="/android-chrome-192x192.png"
            alt=""
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-ink-900 text-[15px] tracking-tight">
            Dinova
          </div>
          <div className="text-[11px] text-ink-500 capitalize">
            {user?.role ? `${user.role} · Console` : "Smart restaurant console"}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto pt-2 pb-6">
        {NAV_SECTIONS.map((sec) => (
          <Section
            key={sec.title}
            title={sec.title}
            items={sec.items}
            pathname={pathname}
            role={user?.role}
          />
        ))}
      </nav>
    </aside>
  );
}
