"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@dinova/lib/api";
import { Search, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Result = { type: string; id: string; title: string; sub: string; link: string };

export function openCommandPalette() {
  document.dispatchEvent(new CustomEvent("dinova:open-palette"));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("dinova:open-palette", onOpen as any);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("dinova:open-palette", onOpen as any);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQ("");
      setResults([]);
      setCursor(0);
    }
  }, [open]);

  const run = useCallback(async (query: string) => {
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const r = await api.get<{ results: Result[] }>(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      setResults(r.results);
      setCursor(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(q.trim()), 180);
    return () => clearTimeout(t);
  }, [q, run]);

  function go(r: Result) {
    router.push(r.link);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/40 p-3 pt-[10vh] backdrop-blur-sm sm:p-4 sm:pt-[15vh]">
      <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-100">
          <Search className="w-4 h-4 text-ink-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter" && results[cursor]) {
                go(results[cursor]);
              }
            }}
            placeholder="Search orders, menu, customers, staff, ingredients, tables…"
            className="flex-1 outline-none text-sm"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-400" />}
          <kbd className="text-[10px] font-semibold text-ink-400 bg-ink-100 rounded px-1.5 py-0.5">
            esc
          </kbd>
          <button
            onClick={() => setOpen(false)}
            className="text-ink-400 hover:text-ink-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {q && results.length === 0 && !loading && (
            <p className="text-sm text-ink-500 text-center py-8">
              No results for “{q}”
            </p>
          )}
          {!q && (
            <p className="text-xs text-ink-400 text-center py-6">
              Try &ldquo;burger&rdquo;, an order code, a phone number…
            </p>
          )}
          {results.map((r, i) => (
            <button
              key={r.type + r.id}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(r)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-ink-50 ${
                i === cursor ? "bg-brand-50" : ""
              }`}
            >
              <span className="w-14 text-[10px] font-semibold uppercase tracking-wider text-ink-500 sm:w-20">
                {r.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">
                  {r.title}
                </p>
                <p className="text-[11px] text-ink-500 truncate">{r.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
