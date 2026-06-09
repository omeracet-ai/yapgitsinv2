"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export interface AdModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  width?: number | string;
  closeOnBackdrop?: boolean;
}

export function AdModal({
  open,
  onClose,
  title,
  footer,
  children,
  width = 520,
  closeOnBackdrop = true,
}: AdModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ad-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ad-modal"
        role="dialog"
        aria-modal="true"
        style={{ width: "100%", maxWidth: width, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {title && (
          <div className="ad-modal-head">
            <span>{title}</span>
            <button
              onClick={onClose}
              aria-label="Kapat"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ad-muted)",
                cursor: "pointer",
                fontSize: 18,
                padding: 4,
                width: 32,
                height: 32,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
              }}
            >
              ×
            </button>
          </div>
        )}
        <div className="ad-modal-body" style={{ overflowY: "auto", flex: 1 }}>
          {children}
        </div>
        {footer && <div className="ad-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
