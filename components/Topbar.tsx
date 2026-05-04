"use client";

import {
  Search,
  ChevronDown,
  CircleDot,
  Plus,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { NotificationsPanel } from "./NotificationsPanel";
import { CommandPalette, openCommandPalette } from "./CommandPalette";
import { OutletSwitcher } from "./OutletSwitcher";
import { canAccess } from "@/lib/roles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_SECTIONS } from "./Sidebar";
import { PushNotificationPrompt } from "./PushNotificationPrompt";
import { NotificationAlertSound } from "./NotificationAlertSound";

export function Topbar() {
  const pathname = usePathname() ?? "/";
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const canNewOrder =
    user && canAccess(user.role, "/orders");
  const mobileSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((it) => user && canAccess(user.role, it.href)),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <header className="sticky top-0 z-20 h-16 border-b border-ink-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-[1400px] items-center gap-3 px-4 md:gap-4 md:px-6">
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-700 lg:hidden"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3 md:max-w-2xl">
            <button
              onClick={openCommandPalette}
              className="relative flex h-9 w-full items-center gap-3 rounded-lg border border-transparent bg-ink-100/70 px-3 text-left transition-colors hover:bg-ink-100"
            >
              <Search className="w-4 h-4 text-ink-400" />
              <span className="flex-1 text-sm text-ink-400">
                Search orders, items, customers...
              </span>
              <kbd className="hidden rounded border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-400 md:block">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 md:flex">
              <CircleDot className="h-3 w-3 animate-pulseDot" />
              Live · Gulberg Outlet
            </div>
            {canNewOrder && (
              <a href="/orders" className="btn-outline hidden md:inline-flex">
                <Plus className="h-4 w-4" /> New order
              </a>
            )}
            <OutletSwitcher />
            <NotificationsPanel />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="ml-1 flex items-center gap-2 border-l border-ink-200 pl-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left leading-tight md:block">
                  <div className="text-sm font-semibold text-ink-900">
                    {user?.name ?? "User"}
                  </div>
                  <div className="text-[11px] capitalize text-ink-500">
                    {user?.role ?? "—"}
                  </div>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-ink-400 md:block" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-52 overflow-hidden rounded-xl border border-ink-200/70 bg-white shadow-pop">
                  <div className="border-b border-ink-100 px-4 py-3">
                    <p className="text-sm font-semibold text-ink-900">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-ink-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <PushNotificationPrompt />
      <NotificationAlertSound />
      {mobileNavOpen && (
        <div className="sticky top-16 z-10 border-b border-ink-200/70 bg-white px-4 py-3 shadow-sm lg:hidden">
          <nav className="max-h-[65vh] space-y-4 overflow-y-auto pb-1">
            {mobileSections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  {section.title}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-100",
                          active && "bg-brand-50 text-brand-700"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
      <CommandPalette />
    </>
  );
}
