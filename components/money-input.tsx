"use client";

import { useState } from "react";

export function groupThousands(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const intRaw = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const grouped = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (dot === -1) return grouped;
  const dec = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${grouped || "0"}.${dec}`;
}

export function MoneyInput({
  name, defaultValue = "", placeholder, className, autoFocus, ariaLabel,
}: {
  name: string; defaultValue?: string; placeholder?: string;
  className?: string; autoFocus?: boolean; ariaLabel?: string;
}) {
  const [value, setValue] = useState(() => (defaultValue ? groupThousands(defaultValue) : ""));
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => setValue(groupThousands(e.target.value))}
      inputMode="decimal"
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
    />
  );
}
