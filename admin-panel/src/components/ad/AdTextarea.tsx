"use client";

import React from "react";

export interface AdTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  help?: string;
  error?: string;
}

export function AdTextarea({
  label,
  help,
  error,
  className = "",
  id,
  rows = 4,
  ...rest
}: AdTextareaProps) {
  const fieldId =
    id ??
    (label ? `ad-ta-${label.replace(/\s+/g, "-").toLowerCase()}` : undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label
          htmlFor={fieldId}
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
      <textarea
        id={fieldId}
        rows={rows}
        {...rest}
        className={`ad-input ${className}`}
        style={{
          resize: "vertical",
          minHeight: 80,
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
