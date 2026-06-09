"use client";

import React from "react";
import Link from "next/link";

export interface AdNavLinkProps {
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AdNavLink({
  href,
  active = false,
  icon,
  children,
  className = "",
}: AdNavLinkProps) {
  return (
    <Link
      href={href}
      className={`ad-nav-link ${active ? "active" : ""} ${className}`}
      style={{ textDecoration: "none" }}
    >
      {icon && (
        <span
          style={{
            width: 18,
            display: "inline-flex",
            justifyContent: "center",
          }}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </Link>
  );
}
