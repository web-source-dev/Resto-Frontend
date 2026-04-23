"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, getToken, setToken } from "./api";
import { homeFor } from "./roles";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  outletId: string;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

const PUBLIC_PATHS = ["/login", "/register"];
const PUBLIC_PREFIXES = ["/qr"];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      if (pathname && !isPublic(pathname)) {
        router.replace("/login");
      }
      return;
    }
    api
      .get("/api/auth/me")
      .then((r: any) => setUser(r.user))
      .catch(() => {
        setToken(null);
        if (pathname && !isPublic(pathname)) {
          router.replace("/login");
        }
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ token: string; user: User }>(
        "/api/auth/login",
        { email, password }
      );
      setToken(res.token);
      setUser(res.user);
      router.replace(homeFor(res.user.role));
    },
    [router]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  return (
    <Ctx.Provider value={{ user, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
