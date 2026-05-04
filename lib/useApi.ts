"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useSocketEvent } from "./SocketProvider";

export function useApi<T = any>(
  path: string | null,
  deps: any[] = [],
  realtime = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathRef = useRef(path);
  pathRef.current = path;

  const refresh = useCallback(async () => {
    if (!pathRef.current) return;
    try {
      setLoading(true);
      const r = await api.get<T>(pathRef.current);
      setData(r);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  const refreshDebounceRef = useRef<number | null>(null);
  useSocketEvent("data:changed", () => {
    if (!realtime || !pathRef.current) return;
    if (refreshDebounceRef.current) {
      window.clearTimeout(refreshDebounceRef.current);
    }
    refreshDebounceRef.current = window.setTimeout(() => {
      refresh();
    }, 180);
  });

  useEffect(() => {
    return () => {
      if (refreshDebounceRef.current) {
        window.clearTimeout(refreshDebounceRef.current);
      }
    };
  }, []);

  return { data, error, loading, refresh, setData };
}
