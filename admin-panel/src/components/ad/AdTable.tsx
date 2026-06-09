"use client";

import React from "react";

export interface AdTableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  wrapClassName?: string;
}

export function AdTable({
  className = "",
  children,
  wrapClassName = "",
  ...rest
}: AdTableProps) {
  return (
    <div className={`ad-table-wrap ${wrapClassName}`} style={{ overflowX: "auto" }}>
      <table {...rest} className={`ad-table ${className}`}>
        {children}
      </table>
    </div>
  );
}
