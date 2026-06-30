"use client";

import { useState } from "react";

const PALETTE = [
  "#0a84ff", "#30d158", "#3b82f6", "#6366f1", "#a855f7",
  "#ec4899", "#f43f5e", "#f59e0b", "#84cc16", "#f97316",
];

export function ColorPicker({ name = "color", defaultValue = "#0a84ff" }: { name?: string; defaultValue?: string }) {
  const [color, setColor] = useState(defaultValue.toLowerCase());
  const swatches = PALETTE.includes(color) ? PALETTE : [color, ...PALETTE];
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={color} />
      <div className="flex flex-wrap gap-2">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Choose color ${c}`}
            aria-pressed={color === c}
            className={`h-8 w-8 rounded-full transition active:scale-90 ${
              color === c ? "ring-2 ring-white ring-offset-2 ring-offset-transparent" : "ring-1 ring-inset ring-[var(--border)]"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}
