"use client";

import { Suspense, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { listCategories } from "@/lib/local/data/categories";
import { getMonthlyBudget, getRecentBudgetBefore } from "@/lib/local/data/budgets";
import { getYearMonth, parseYearMonth, formatMonthLabel } from "@/lib/month";
import { CategoryManager } from "@/components/category-manager";
import { BudgetForm } from "@/components/budget-form";
import { MonthSwitcher } from "@/components/month-switcher";
import { SyncStatusChip } from "@/components/sync-status";
import { syncNow } from "@/lib/sync/client";
import { localDb } from "@/lib/local/db";
import { logoutAction } from "@/app/actions/auth";
import { lockApp } from "@/lib/local/lock";
import { Skeleton } from "@/components/skeleton";

function ManageInner() {
  const sp = useSearchParams();
  const ym = parseYearMonth(sp.get("y") ?? undefined, sp.get("m") ?? undefined, getYearMonth(new Date()));
  const [syncPending, startSync] = useTransition();
  const [exportPending, startExport] = useTransition();

  const data = useLiveQuery(
    async () => {
      const [categories, currentAmount, suggested] = await Promise.all([
        listCategories(),
        getMonthlyBudget(ym),
        getRecentBudgetBefore(ym),
      ]);
      return { categories, currentAmount, suggested };
    },
    [ym.year, ym.month],
  );

  async function onLogout() {
    try {
      await logoutAction();
    } catch {
      // Offline: can't clear the server cookie, but still lock the device.
    }
    await lockApp();
  }

  function onSyncNow() {
    startSync(async () => {
      try {
        await syncNow();
        toast.success("Synced");
      } catch {
        toast.error("Sync failed — try again when online");
      }
    });
  }

  function onExportBackup() {
    startExport(async () => {
      try {
        const [categories, transactions, expenseItems, monthlyBudgets] = await Promise.all([
          localDb.categories.toArray(),
          localDb.transactions.toArray(),
          localDb.expenseItems.toArray(),
          localDb.monthlyBudgets.toArray(),
        ]);
        const payload = {
          exportedAt: new Date().toISOString(),
          categories,
          transactions,
          expenseItems,
          monthlyBudgets,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Backup downloaded");
      } catch {
        toast.error("Could not export backup");
      }
    });
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md space-y-6 px-4 pb-28 pt-6">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </main>
    );
  }

  const { categories, currentAmount, suggested } = data;

  return (
    <main className="mx-auto max-w-md space-y-6 px-4 pb-28 pt-6">
      <div className="reveal flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="display text-2xl font-bold tracking-tight">Manage</h1>
          <SyncStatusChip />
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          Log out
        </button>
      </div>

      {/* ── Sync tools ──────────────────────────────────────────────────────── */}
      <div className="reveal flex items-center gap-2.5" style={{ animationDelay: "30ms" }}>
        <button
          type="button"
          onClick={onSyncNow}
          disabled={syncPending}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-60"
          style={{
            background: "var(--card)",
            border: "0.5px solid var(--border)",
            color: "var(--accent)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
            <path d="M21.5 2v6h-6" />
            <path d="M2.5 12A10 10 0 0 1 20.5 6.3l1-2.3" />
            <path d="M2.5 22v-6h6" />
            <path d="M21.5 12A10 10 0 0 1 3.5 17.7l-1 2.3" />
          </svg>
          {syncPending ? "Syncing…" : "Sync now"}
        </button>

        <button
          type="button"
          onClick={onExportBackup}
          disabled={exportPending}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-60"
          style={{
            background: "var(--card)",
            border: "0.5px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exportPending ? "Exporting…" : "Export backup"}
        </button>
      </div>

      <div className="reveal space-y-3" style={{ animationDelay: "60ms" }}>
        <MonthSwitcher ym={ym} basePath="/categories" />
        <BudgetForm
          key={`${ym.year}-${ym.month}-${currentAmount ?? "none"}`}
          year={ym.year}
          month={ym.month}
          label={formatMonthLabel(ym)}
          currentAmount={currentAmount}
          suggested={suggested}
        />
        <p className="px-1 text-xs text-muted-foreground">
          Use ‹ › to set a budget for a past or future month. Past months bank into Savings.
        </p>
      </div>

      <div className="reveal space-y-3" style={{ animationDelay: "120ms" }}>
        <h2 className="eyebrow px-1">Categories</h2>
        <CategoryManager categories={categories} />
      </div>
    </main>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense>
      <ManageInner />
    </Suspense>
  );
}
