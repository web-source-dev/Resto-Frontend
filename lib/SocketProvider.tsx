"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "./config";
import { getToken } from "./api";
import { useAuth } from "./AuthProvider";

const Ctx = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      ref.current?.disconnect();
      ref.current = null;
      setSocket(null);
      return;
    }
    const s = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: getToken() },
      reconnection: true,
    });
    ref.current = s;
    setSocket(s);
    return () => {
      s.disconnect();
      ref.current = null;
    };
  }, [user]);

  return <Ctx.Provider value={socket}>{children}</Ctx.Provider>;
}

export function useSocket() {
  return useContext(Ctx);
}

export function useSocketEvent<T = any>(
  event: string,
  handler: (payload: T) => void
) {
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
