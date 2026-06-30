"use client";

import type { CSSProperties } from "react";
import { formatCentavos } from "@/lib/money";
import type { ThemeDef } from "@/lib/themes";

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--muted)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent)" }} />
    </div>
  );
}

export function ThemeCard({ theme }: { theme: ThemeDef }) {
  // Set every token as a scoped CSS variable on the wrapper, so the mock below
  // resolves var(--…) to THIS theme's values independently of the page.
  const wrapperStyle = {
    ...theme.tokens,
    ...(theme.fontStack ? { fontFamily: theme.fontStack } : {}),
    background: "var(--background)",
    color: "var(--foreground)",
  } as CSSProperties;

  // The surface look (incl. glass/neumorphic/brutalist effects) as a real CSS rule
  // scoped by a per-theme class; var() references resolve to the wrapper's tokens.
  const surf = `surf-${theme.id}`;
  const surfRule = `.${surf}{background:var(--card);color:var(--card-foreground);border:1px solid var(--border);border-radius:var(--radius);${theme.surfaceCss ?? ""}}`;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-base font-semibold text-zinc-900">{theme.name}</h2>
        <span className="text-xs text-zinc-500">{theme.blurb}</span>
      </div>

      <style>{surfRule}</style>

      <div style={wrapperStyle} className="space-y-3 overflow-hidden rounded-2xl p-4 shadow-sm ring-1 ring-black/10">
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>‹ June 2026 ›</span>
          <span>Manage</span>
        </div>

        <div className={`${surf} p-3`}>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Spent this month</div>
          <div className="mt-0.5 text-2xl font-bold">{formatCentavos(1847500)}</div>
          <div className="mt-2"><Bar pct={62} /></div>
        </div>

        <div className={`${surf} p-3`}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🍜</span>
            <span className="text-sm font-medium">Food</span>
            <span className="ml-auto text-sm" style={{ color: "var(--muted-foreground)" }}>{formatCentavos(520000)}</span>
          </div>
          <Bar pct={72} />
        </div>

        <div className={`${surf} p-3`}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-lg">🚌</span>
            <span className="text-sm font-medium">Transport</span>
            <span className="ml-auto text-sm" style={{ color: "var(--muted-foreground)" }}>{formatCentavos(127500)}</span>
          </div>
          <Bar pct={34} />
        </div>

        <div className="flex justify-end pt-1">
          <div
            className="grid h-9 w-9 place-items-center rounded-full text-lg font-medium shadow"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            +
          </div>
        </div>
      </div>
    </section>
  );
}
