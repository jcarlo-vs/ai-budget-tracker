import { formatCentavos } from "@/lib/money";

export type DonutDatum = {
  id: number;
  name: string;
  emoji: string;
  color: string;
  spent: number;
};

const OTHER_COLOR = "#8e8e93"; // iOS neutral grey for the grouped remainder

/**
 * Spending-breakdown donut (pure inline SVG, server-renderable). Shows this
 * month's spending split across the top categories by spend, grouping the long
 * tail into a neutral "Other" slice, with a compact legend beside it. Arcs are
 * drawn with stroke-dasharray on a single circle. Renders an empty state when
 * nothing has been spent.
 */
export function SpendDonut({ data }: { data: DonutDatum[] }) {
  const spentItems = data.filter((d) => d.spent > 0);
  const total = spentItems.reduce((acc, d) => acc + d.spent, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <span className="text-3xl">🪙</span>
        <p className="text-sm text-muted-foreground">No spending yet this month.</p>
      </div>
    );
  }

  const sorted = [...spentItems].sort((a, b) => b.spent - a.spent);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const otherTotal = rest.reduce((acc, d) => acc + d.spent, 0);

  type Slice = { key: string; label: string; emoji: string | null; color: string; value: number };
  const slices: Slice[] = top.map((d) => ({
    key: String(d.id),
    label: d.name,
    emoji: d.emoji,
    color: d.color,
    value: d.spent,
  }));
  if (otherTotal > 0) {
    slices.push({ key: "other", label: "Other", emoji: null, color: OTHER_COLOR, value: otherTotal });
  }

  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = slices.length > 1 ? 2 : 0;

  let acc = 0;
  const arcs = slices.map((s) => {
    const len = (s.value / total) * c;
    const dash = Math.max(len - gap, 0.5);
    const node = (
      <circle
        key={s.key}
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${c}`}
        strokeDashoffset={-acc}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    );
    acc += len;
    return node;
  });

  return (
    <div className="space-y-4">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden className="block">
          {arcs}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="flex flex-col items-center">
            <span className="text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
              Spent
            </span>
            <span
              className="money font-semibold leading-none"
              style={{ fontSize: "clamp(0.9rem, 4.5vw, 1.15rem)" }}
            >
              {formatCentavos(total)}
            </span>
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {slices.map((s) => {
          const sharePct = Math.round((s.value / total) * 100);
          return (
            <li key={s.key} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              {s.emoji && (
                <span aria-hidden className="shrink-0 text-base leading-none">
                  {s.emoji}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{sharePct}%</span>
              <span className="money shrink-0 font-medium">{formatCentavos(s.value)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
