"use client";

import React from "react";

export interface AdSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  help?: string;
  error?: string;
}

export function AdSelect({
  label,
  help,
  error,
  className = "",
  id,
  children,
  ...rest
}: AdSelectProps) {
  const selId =
    id ??
    (label ? `ad-sel-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label
          htmlFor={selId}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--ad-ink-dim)",
            marginBottom: 2,
          }}
        >
          {label}
        </label>
      )}
      <select
        id={selId}
        {...rest}
        className={`ad-input ${className}`}
        style={{
          borderColor: error ? "var(--ad-err)" : undefined,
          ...rest.style,
        }}
      >
        {children}
      </select>
      {help && !error && (
        <span
          style={{
            fontSize: 12,
            fontStyle: "italic",
            color: "var(--ad-muted)",
          }}
        >
          {help}
        </span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: "var(--ad-err-tx)" }}>{error}</span>
      )}
    </div>
  );
}
