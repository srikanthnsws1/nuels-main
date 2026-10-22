"use client";

import { useLenis } from "lenis/react";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "../icons";

/** Modal dialog used across the dashboards: a bottom sheet on phones, centred on larger screens. */
export default function Dialog({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  const id = useId();
  const lenis = useLenis();

  useEffect(() => {
    lenis?.stop();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
    };
  }, [lenis, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-forest-950/60 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        data-lenis-prevent
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl shadow-forest-950/30 sm:rounded-3xl sm:p-7 ${wide ? "sm:max-w-3xl" : "sm:max-w-md"}`}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id={id} className="text-xl font-bold tracking-tight text-forest-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-forest-50 hover:text-forest-700"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
