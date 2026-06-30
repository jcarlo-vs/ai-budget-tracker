import Link from "next/link";
import type { Category } from "@/lib/db/schema";
import { BudgetBar } from "@/components/budget-bar";

export function CategoryCard({ category, spent }: { category: Category; spent: number }) {
  return (
    <Link
      href={`/category/${category.id}`}
      className="surface group relative block overflow-hidden p-4 transition-transform duration-150 active:scale-[0.985]"
    >
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-1 rounded-full"
        style={{ background: category.color, boxShadow: `0 0 12px -1px ${category.color}` }}
      />
      <div className="mb-3 flex items-center gap-3 pl-2">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ring-1 ring-inset ring-[var(--border)]"
          style={{ background: `color-mix(in srgb, ${category.color} 22%, transparent)` }}
        >
          {category.emoji}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{category.name}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-active:translate-x-0.5"
          aria-hidden>
          <path d="m9 6 6 6-6 6" />
        </svg>
      </div>
      <div className="pl-2">
        <BudgetBar spent={spent} budget={category.monthlyBudget} color={category.color} />
      </div>
    </Link>
  );
}
