"use client";

import React from "react";

type Variant = "primary" | "secondary" | "danger";
type Size = "md" | "sm";

export interface AdButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export function AdButton({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...rest
}: AdButtonProps) {
  const cls = [
    "ad-btn",
    variant === "secondary" ? "ad-btn-secondary" : "",
    variant === "danger" ? "ad-btn-danger" : "",
    size === "sm" ? "ad-btn-sm" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cls}
      style={{
        width: fullWidth ? "100%" : undefined,
        ...rest.style,
      }}
    >
      {loading && <span className="ad-spinner" aria-hidden />}
      {children}
    </button>
  );
}
