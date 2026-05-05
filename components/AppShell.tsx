"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@dinova/lib/AuthProvider";
import { Flame } from "lucide-react";
import { canAccess, homeFor } from "@dinova/lib/roles";

const PUBLIC_PATHS = ["/login", "/register"];
const PUBLIC_PREFIXES = ["/qr"];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (isPublic(pathname)) return;
    if (!canAccess(user.role, pathname)) {
      router.replace(homeFor(user.role));
    }
  }, [user, loading, pathname, router]);

  if (isPublic(pathname)) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center animate-pulseDot">
            <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-sm text-ink-500">Loading Dinova…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
