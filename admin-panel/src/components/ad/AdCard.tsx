"use client";

import React from "react";

export interface AdCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  padding?: number | string;
}

export function AdCard({
  className = "",
  children,
  padding,
  style,
  ...rest
}: AdCardProps) {
  return (
    <div
      {...rest}
      className={`ad-card ${className}`}
      style={{ padding: padding ?? undefined, ...style }}
    >
      {children}
    </div>
  );
}
