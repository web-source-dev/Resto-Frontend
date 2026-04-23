"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useSocketEvent } from "@/lib/SocketProvider";
import { Bell, AlertTriangle, CheckCircle2, Info, X, ExternalLink } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

type N = {
  id: string;
  type: string;
  level: "info" | "success" | "warn" | "error";
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<N[]>([]);
  const [unread, setUnread] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ items: N[]; unread: number }>(
        "/api/notifications?limit=30"
      );
      setItems(r.items);
      setUnread(r.unread);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, [load]);

  useSocketEvent("notification:new", () => load());

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markAllRead() {
    await api.post("/api/notifications/read", { ids: [] });
    load();
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) markAllRead();
        }}
        className="relative w-9 h-9 rounded-lg hover:bg-ink-100 flex items-center justify-center"
      >
        <Bell className="w-[18px] h-[18px] text-ink-600" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 bg-brand-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          className="absolute right-4 top-14 w-96 max-h-[70vh] bg-white rounded-xl border border-ink-200/70 shadow-pop z-30 flex flex-col"
        >
          <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink-900 text-sm">Notifications</p>
              <p className="text-[11px] text-ink-500">
                {unread > 0
                  ? `${unread} unread`
                  : "You're all caught up"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-400 hover:text-ink-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-ink-400 text-center py-10">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => <Row key={n.id} n={n} onClick={() => setOpen(false)} />)
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ n, onClick }: { n: N; onClick: () => void }) {
  const { Icon, color } =
    n.level === "error"
      ? { Icon: AlertTriangle, color: "bg-rose-50 text-rose-600" }
      : n.level === "warn"
      ? { Icon: AlertTriangle, color: "bg-amber-50 text-amber-700" }
      : n.level === "success"
      ? { Icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" }
      : { Icon: Info, color: "bg-sky-50 text-sky-700" };

  const ago = (() => {
    const m = Math.round((Date.now() - new Date(n.createdAt).getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })();

  const content = (
    <div
      className={clsx(
        "px-4 py-3 flex items-start gap-3 hover:bg-ink-50/60 border-b border-ink-100 last:border-b-0",
        !n.read && "bg-brand-50/30"
      )}
    >
      <div
        className={clsx(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          color
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-900 leading-snug">{n.title}</p>
        {n.body && (
          <p className="text-[11px] text-ink-500 mt-0.5 leading-snug line-clamp-2">
            {n.body}
          </p>
        )}
        <p className="text-[10px] text-ink-400 mt-1">{ago}</p>
      </div>
      {n.link && <ExternalLink className="w-3.5 h-3.5 text-ink-300 shrink-0 mt-1" />}
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return content;
}
