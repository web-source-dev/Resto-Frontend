"use client";

import {
  Search,
  ChevronDown,
  CircleDot,
  Plus,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { NotificationsPanel } from "./NotificationsPanel";
import { CommandPalette, openCommandPalette } from "./CommandPalette";
import { OutletSwitcher } from "./OutletSwitcher";
import { canAccess } from "@/lib/roles";

export function Topbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const canNewOrder =
    user && canAccess(user.role, "/orders");

  return (
    <>
      <header className="h-16 sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-ink-200/70 flex items-center px-6 gap-4">
        <div className="flex-1 flex items-center gap-3 max-w-xl">
          <button
            onClick={openCommandPalette}
            className="w-full relative h-9 flex items-center gap-3 px-3 rounded-lg bg-ink-100/70 border border-transparent hover:bg-ink-100 text-left"
          >
            <Search className="w-4 h-4 text-ink-400" />
            <span className="text-sm text-ink-400 flex-1">
              Search orders, items, customers…
            </span>
            <kbd className="text-[10px] font-semibold text-ink-400 bg-white border border-ink-200 rounded px-1.5 py-0.5 hidden md:block">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
            <CircleDot className="w-3 h-3 animate-pulseDot" />
            Live · Gulberg Outlet
          </div>
          {canNewOrder && (
            <a href="/orders" className="btn-outline hidden md:inline-flex">
              <Plus className="w-4 h-4" /> New order
            </a>
          )}
          <OutletSwitcher />
          <NotificationsPanel />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-2 border-l border-ink-200 ml-1"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center text-sm font-semibold">
                {initials}
              </div>
              <div className="hidden md:block leading-tight text-left">
                <div className="text-sm font-semibold text-ink-900">
                  {user?.name ?? "User"}
                </div>
                <div className="text-[11px] text-ink-500 capitalize">
                  {user?.role ?? "—"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-ink-400 hidden md:block" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-xl border border-ink-200/70 shadow-pop overflow-hidden">
                <div className="px-4 py-3 border-b border-ink-100">
                  <p className="text-sm font-semibold text-ink-900">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-ink-500">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <CommandPalette />
    </>
  );
}
