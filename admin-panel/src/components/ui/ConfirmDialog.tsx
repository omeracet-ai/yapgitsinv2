"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingState {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

const VARIANT_BTN: Record<ConfirmVariant, string> = {
  danger: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
  warning: "bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-400",
  info: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500",
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, resolve });
    });
  }, []);

  const close = useCallback(
    (ok: boolean) => {
      if (!pending) return;
      pending.resolve(ok);
      setPending(null);
    },
    [pending]
  );

  // Focus trap + key handling
  useEffect(() => {
    if (!pending) return;
    // Focus the cancel button by default (safer for danger)
    const variant = pending.opts.variant ?? "info";
    const target =
      variant === "danger" ? cancelBtnRef.current : confirmBtnRef.current;
    target?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      } else if (e.key === "Enter") {
        // Enter confirms unless focus is on cancel
        if (document.activeElement === cancelBtnRef.current) return;
        e.preventDefault();
        close(true);
      } else if (e.key === "Tab") {
        // Simple two-button trap
        const focusables = [cancelBtnRef.current, confirmBtnRef.current].filter(
          Boolean
        ) as HTMLElement[];
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        const next = e.shiftKey
          ? focusables[(idx - 1 + focusables.length) % focusables.length]
          : focusables[(idx + 1) % focusables.length];
        next.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  const variant = pending?.opts.variant ?? "info";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          aria-hidden={false}
          onMouseDown={(e) => {
            // backdrop click cancels
            if (e.target === e.currentTarget) close(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={pending.opts.message ? "confirm-message" : undefined}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <h3
              id="confirm-title"
              className="text-base font-semibold text-gray-900 mb-1"
            >
              {pending.opts.title}
            </h3>
            {pending.opts.message && (
              <p
                id="confirm-message"
                className="text-sm text-gray-600 mb-3 whitespace-pre-line"
              >
                {pending.opts.message}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={() => close(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                {pending.opts.cancelLabel ?? "İptal"}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => close(true)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 ${VARIANT_BTN[variant]}`}
              >
                {pending.opts.confirmLabel ?? "Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error(
      "useConfirm must be used within a ConfirmDialogProvider"
    );
  }
  return ctx;
}
