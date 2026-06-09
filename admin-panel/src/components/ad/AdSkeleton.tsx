"use client";

import React from "react";

export interface AdSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
}

export function AdSkeleton({
  width = "100%",
  height = 16,
  rounded,
  className = "",
  style,
  ...rest
}: AdSkeletonProps) {
  return (
    <div
      {...rest}
      className={`ad-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded ?? undefined,
        ...style,
      }}
    />
  );
}

export function AdSkeletonRows({
  rows = 3,
  rowHeight = 16,
  gap = 10,
}: {
  rows?: number;
  rowHeight?: number;
  gap?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <AdSkeleton
          key={i}
          height={rowHeight}
          width={i === rows - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}
