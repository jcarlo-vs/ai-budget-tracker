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
  value: controlledValue, onValueChange,
}: {
  name?: string; defaultValue?: string; placeholder?: string;
  className?: string; autoFocus?: boolean; ariaLabel?: string;
  // Optional controlled mode: when `value`/`onValueChange` are provided the
  // parent owns the (already grouped) string. Otherwise the input manages its
  // own state (unchanged behaviour for existing callers).
  value?: string; onValueChange?: (next: string) => void;
}) {
  const controlled = controlledValue !== undefined;
  const [internal, setInternal] = useState(() => (defaultValue ? groupThousands(defaultValue) : ""));
  const value = controlled ? controlledValue : internal;
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => {
        const next = groupThousands(e.target.value);
        if (!controlled) setInternal(next);
        onValueChange?.(next);
      }}
      inputMode="decimal"
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
    />
  );
}
