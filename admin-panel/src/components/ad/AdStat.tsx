"use client";

import React from "react";

export interface AdStatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function AdStat({ label, value, sub, icon, className = "" }: AdStatProps) {
  return (
    <div className={`ad-stat ${className}`}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ad-muted)",
            }}
            className="ad-stat-lbl"
          >
            {label}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--ad-ink)",
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
          {sub && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "var(--ad-muted)",
              }}
            >
              {sub}
            </div>
          )}
        </div>
        {icon && (
          <div
            style={{
              fontSize: 20,
              color: "var(--ad-gold)",
              opacity: 0.8,
            }}
            aria-hidden
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
