"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronsUpDown, Check, Plus } from "lucide-react";
import { api, setToken } from "@dinova/lib/api";
import { useToast } from "./Toaster";

export function OutletSwitcher() {
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  async function load() {
    try {
      const r = await api.get("/api/outlets");
      setData(r);
    } catch {}
  }
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!open) return;
    function h(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  async function switchTo(id: string) {
    setSwitching(id);
    try {
      const r = await api.post<{ token: string }>("/api/outlets/switch", {
        outletId: id,
      });
      setToken(r.token);
      toast("Outlet switched · reloading", "success");
      setTimeout(() => window.location.reload(), 400);
    } catch (e: any) {
      toast(e.message, "error");
      setSwitching(null);
    }
  }

  async function createOutlet() {
    if (!name.trim()) return;
    try {
      await api.post("/api/outlets", { name: name.trim() });
      toast("Outlet created", "success");
      setCreating(false);
      setName("");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const outlets = data?.outlets ?? [];
  const current = outlets.find(
    (o: any) => o.id === data?.currentOutletId
  );

  // Don't render at all if the user only has one outlet and can't create
  if (!data) return null;
  if (outlets.length <= 1 && !data.canCreate) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-ink-100/70 hover:bg-ink-100 text-xs font-medium"
        title="Switch outlet"
      >
        <Building2 className="w-3.5 h-3.5 text-ink-500" />
        <span className="max-w-[140px] truncate">
          {current?.name ?? "Outlet"}
        </span>
        <ChevronsUpDown className="w-3 h-3 text-ink-400" />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="absolute right-2 top-14 z-30 w-[min(18rem,calc(100vw-1rem))] rounded-xl border border-ink-200/70 bg-white shadow-pop sm:right-4 sm:w-72"
        >
          <div className="px-4 py-3 border-b border-ink-100">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">
              Outlets
            </p>
            <p className="text-xs text-ink-500 mt-0.5">
              {outlets.length} accessible
            </p>
          </div>
          <div className="max-h-[40vh] overflow-y-auto">
            {outlets.map((o: any) => {
              const active = o.id === data.currentOutletId;
              return (
                <button
                  key={o.id}
                  onClick={() => !active && switchTo(o.id)}
                  disabled={switching === o.id}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-ink-50 text-left disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 text-brand-800 flex items-center justify-center text-sm font-bold shrink-0">
                    {o.name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{o.name}</p>
                    {o.address && (
                      <p className="text-[11px] text-ink-500 truncate">
                        {o.address}
                      </p>
                    )}
                  </div>
                  {active && (
                    <Check className="w-4 h-4 text-brand-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {data.canCreate && (
            <div className="border-t border-ink-100 p-3">
              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm text-brand-600 hover:bg-brand-50 rounded-lg"
                >
                  <Plus className="w-4 h-4" /> Add outlet
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    placeholder="e.g. DHA Phase 5 Outlet"
                    className="w-full h-9 px-3 rounded-lg border border-ink-200 text-sm focus:border-brand-400 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCreating(false);
                        setName("");
                      }}
                      className="flex-1 text-xs py-1.5 rounded-md border border-ink-200 hover:bg-ink-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createOutlet}
                      disabled={!name.trim()}
                      className="flex-1 text-xs py-1.5 rounded-md bg-brand-500 text-white font-semibold disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
