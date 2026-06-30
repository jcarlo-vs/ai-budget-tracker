import type { CSSProperties } from "react";
import { formatCentavos } from "@/lib/money";

/**
 * Circular "Safe-to-Spend" gauge (Cleo-style), pure inline SVG so it can be a
 * server component. The ring shows spent / budget (clamped to a full ring when
 * over); it is healthy green under budget and switches to danger red over. The
 * center reads out the remaining amount ("Safe to spend") or the overspend
 * ("Over budget"). Only render this when a budget exists — the no-budget hero
 * lives in the page.
 */
export function BudgetGauge({
  spent,
  budget,
  allocated,
}: {
  spent: number;
  budget: number;
  allocated: number;
}) {
  const remaining = budget - spent;
  const over = spent > budget;
  const fraction = budget > 0 ? Math.min(1, Math.max(0, spent / budget)) : 0;
  const usedPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  const size = 208;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - fraction);

  const ring = over ? "var(--danger)" : "var(--accent-2)";

  // Red tick marking the allocated total (sum of category budgets) at its
  // position around the ring, i.e. allocated / budget.
  const allocFraction = budget > 0 ? Math.min(1, Math.max(0, allocated / budget)) : 0;
  const showTick = budget > 0 && allocated > 0;
  const tickAngle = (allocFraction * 360 - 90) * (Math.PI / 180);
  const tIn = r - stroke / 2 - 2;
  const tOut = r + stroke / 2 + 2;
  const tx1 = size / 2 + tIn * Math.cos(tickAngle);
  const ty1 = size / 2 + tIn * Math.sin(tickAngle);
  const tx2 = size / 2 + tOut * Math.cos(tickAngle);
  const ty2 = size / 2 + tOut * Math.sin(tickAngle);

  // Whole-peso hero amount (centavos are noise at this size), with the font
  // sized to the string length so it always fits inside the ring.
  const amountValue = over ? spent - budget : remaining;
  const amountText = `₱${Math.round(Math.abs(amountValue) / 100).toLocaleString("en-PH")}`;
  const amountFontSize =
    amountText.length <= 7 ? "2rem"
    : amountText.length <= 9 ? "1.625rem"
    : amountText.length <= 11 ? "1.375rem"
    : "1.125rem";

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        aria-hidden
        className="block"
      >
        {/* Neutral track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth={stroke}
        />
        {/* Progress ring — starts at 12 o'clock, sweeps clockwise */}
        <circle
          className="gauge-ring"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={
            {
              "--gauge-c": c,
              filter: `drop-shadow(0 0 7px color-mix(in srgb, ${ring} 60%, transparent))`,
            } as CSSProperties
          }
        />
        {/* Allocated marker — a small red tick across the ring. */}
        {showTick && (
          <>
            <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--background)" strokeWidth={6} strokeLinecap="round" />
            <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#ff453a" strokeWidth={3} strokeLinecap="round" />
          </>
        )}
      </svg>

      <div className="absolute inset-0 grid place-items-center px-6 text-center">
        <div className="flex flex-col items-center">
          <span
            className={`eyebrow ${over ? "text-danger" : ""}`}
            style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            {over ? "Over budget" : "Safe to spend"}
          </span>
          <span
            className={`money display mt-1 max-w-[160px] whitespace-nowrap font-bold leading-none tracking-tight ${
              over ? "text-danger" : "text-foreground"
            }`}
            style={{ fontSize: amountFontSize }}
          >
            {amountText}
          </span>
          <span className="mt-2 text-xs text-muted-foreground">
            {usedPct}% of {formatCentavos(budget)} used
          </span>
          {showTick && (
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[0.625rem] text-muted-foreground">
              <span className="inline-block h-2.5 w-[2px] rounded-full" style={{ background: "#ff453a" }} />
              allocated {formatCentavos(allocated)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
