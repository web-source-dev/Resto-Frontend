"use client";

import { useState } from "react";
import { useAuth } from "@dinova/lib/AuthProvider";

const demos = [
  { role: "Admin", email: "admin@dinova.dev", password: "admin123" },
  { role: "Manager", email: "manager@dinova.dev", password: "manager123" },
  { role: "Receptionist", email: "receptionist@dinova.dev", password: "recept123" },
  { role: "Waiter", email: "waiter@dinova.dev", password: "waiter123" },
  { role: "Kitchen", email: "kitchen@dinova.dev", password: "kitchen123" },
  { role: "Rider", email: "rider@dinova.dev", password: "rider123" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@dinova.dev");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function quick(d: (typeof demos)[number]) {
    setEmail(d.email);
    setPassword(d.password);
    setError(null);
    setLoading(true);
    try {
      await login(d.email, d.password);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-50 via-white to-brand-50 p-4 sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white shadow-pop ring-1 ring-ink-200/80">
            <img
              src="/apple-touch-icon.png"
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <div className="font-bold text-ink-900 text-xl tracking-tight">
              Dinova
            </div>
            <div className="text-xs text-ink-500">Smart restaurant solution · Multi-role console</div>
          </div>
        </div>

        <div className="card p-5 sm:p-7">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
            Welcome back
          </h1>
          <p className="subtle mt-1">Sign in to your restaurant dashboard</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-3 rounded-lg border border-ink-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 px-3 rounded-lg border border-ink-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm"
              />
            </div>

            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-ink-100">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-2">
              Test any role instantly
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {demos.map((d) => (
                <button
                  key={d.email}
                  onClick={() => quick(d)}
                  disabled={loading}
                  className="text-xs font-medium px-2 py-2 rounded-lg bg-ink-50 text-ink-700 hover:bg-ink-100 border border-ink-200 disabled:opacity-50"
                >
                  {d.role}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink-400 mt-2 leading-snug">
              Each role lands on a different default view with permissions from PRD §5.
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-400 mt-6">
          v1.0 · Built from PRD · 5 operational surfaces, one source of truth.
        </p>
      </div>
    </div>
  );
}
