"use client";

import React from "react";

export interface AdInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  help?: string;
  error?: string;
}

export function AdInput({
  label,
  help,
  error,
  className = "",
  id,
  ...rest
}: AdInputProps) {
  const inputId =
    id ?? (label ? `ad-input-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label
          htmlFor={inputId}
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
      <input
        id={inputId}
        {...rest}
        className={`ad-input ${className}`}
        style={{
          borderColor: error ? "var(--ad-err)" : undefined,
          ...rest.style,
        }}
      />
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
