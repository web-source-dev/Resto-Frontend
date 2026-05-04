"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-lg",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/40 p-2 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={`flex max-h-[92vh] w-full flex-col rounded-2xl border border-ink-200/70 bg-white shadow-pop sm:max-h-[90vh] ${width}`}
      >
        <div className="flex items-start justify-between border-b border-ink-100 p-4 sm:p-5">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
            {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-ink-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-ink-100 bg-ink-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold text-ink-700 mb-1">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-ink-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-10 px-3 rounded-lg border border-ink-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full h-10 px-3 rounded-lg border border-ink-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 rounded-lg border border-ink-200 bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm ${props.className ?? ""}`}
    />
  );
}
