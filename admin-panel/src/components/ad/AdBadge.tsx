"use client";

import React from "react";

type Variant = "success" | "warn" | "err" | "info" | "muted";

export interface AdBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function AdBadge({
  variant = "muted",
  className = "",
  children,
  ...rest
}: AdBadgeProps) {
  return (
    <span
      {...rest}
      className={`ad-badge ad-badge-${variant} ${className}`}
    >
      {children}
    </span>
  );
}
