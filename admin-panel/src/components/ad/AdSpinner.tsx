"use client";

import React from "react";

export interface AdSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function AdSpinner({ size = 18, className = "", label }: AdSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label ?? "Yükleniyor"}
      className={`ad-spinner ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
