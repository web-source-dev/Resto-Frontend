"use client";

import { API_URL } from "./config";

export const qrApi = {
  async get<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error ?? res.statusText);
    return data as T;
  },
  async post<T = any>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(data?.error ?? res.statusText);
    return data as T;
  },
};
