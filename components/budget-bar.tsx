import { formatCentavos } from "@/lib/money";

export function BudgetBar({ spent, budget, color }: { spent: number; budget: number; color?: string }) {
  const over = budget > 0 && spent > budget;
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const fill = over ? "var(--danger)" : color ?? "var(--accent)";
  return (
    <div data-testid="budget-bar" data-over={over} className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="money font-medium text-foreground">{formatCentavos(spent)}</span>
        {budget > 0 && <span className="money text-muted-foreground">{formatCentavos(budget)}</span>}
      </div>
      {budget > 0 && (
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--field)] ring-1 ring-inset ring-[var(--border)]">
          <div
            className="bar-fill h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, color-mix(in srgb, ${fill} 70%, transparent), ${fill})`,
              boxShadow: `0 0 12px -2px ${fill}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
