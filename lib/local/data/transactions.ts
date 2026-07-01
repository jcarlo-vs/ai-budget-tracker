import { localDb } from "@/lib/local/db";
import { touch } from "@/lib/local/touch";
import type { LocalTransaction, LocalExpenseItem } from "@/lib/local/types";
import type { ExpenseInput, ItemInput } from "@/lib/schemas";
import { monthRange, type YearMonth } from "@/lib/month";
import { getCategoriesWithMonthTotals } from "@/lib/local/data/overview";

export type TransactionWithItems = LocalTransaction & { items: LocalExpenseItem[] };

const now = () => new Date().toISOString();
const sumItems = (items: ItemInput[]): number => items.reduce((acc, i) => acc + i.amount, 0);

function newItemRows(transactionId: string, items: ItemInput[], ts: string): LocalExpenseItem[] {
  const baseMs = Date.parse(ts);
  // Offset createdAt by index so items keep their entered order when re-read
  // (uuid ids aren't insertion-ordered the way the old serial ids were).
  return items.map((i, idx) => ({
    id: crypto.randomUUID(),
    transactionId,
    name: i.name,
    amount: i.amount,
    createdAt: new Date(baseMs + idx).toISOString(),
    updatedAt: ts,
    deletedAt: null,
  }));
}

async function tombstoneItems(transactionId: string, ts: string): Promise<void> {
  const existing = await localDb.expenseItems.where("transactionId").equals(transactionId).toArray();
  for (const it of existing) {
    if (it.deletedAt == null) await localDb.expenseItems.update(it.id, { deletedAt: ts, updatedAt: ts });
  }
}

export async function addExpense(input: ExpenseInput, items?: ItemInput[]): Promise<LocalTransaction> {
  const ts = now();
  const itemized = items != null && items.length > 0;
  const amount = itemized ? sumItems(items!) : input.amount;
  const row: LocalTransaction = {
    id: crypto.randomUUID(),
    categoryId: input.categoryId,
    amount,
    description: input.description ?? "",
    occurredOn: input.occurredOn,
    paymentMethod: input.paymentMethod ?? "cash",
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await localDb.transactions.put(row);
  if (itemized) await localDb.expenseItems.bulkPut(newItemRows(row.id, items!, ts));
  touch();
  return row;
}

// items === undefined → leave items as-is, use input.amount.
// items === []         → clear items, use input.amount.
// items has entries    → replace items, amount = sum(items).
export async function updateExpense(id: string, input: ExpenseInput, items?: ItemInput[]): Promise<LocalTransaction> {
  const ts = now();
  const replacing = items !== undefined;
  const itemized = replacing && items!.length > 0;
  const amount = itemized ? sumItems(items!) : input.amount;
  await localDb.transactions.update(id, {
    categoryId: input.categoryId,
    amount,
    description: input.description ?? "",
    occurredOn: input.occurredOn,
    paymentMethod: input.paymentMethod ?? "cash",
    updatedAt: ts,
  });
  if (replacing) {
    await tombstoneItems(id, ts);
    if (itemized) await localDb.expenseItems.bulkPut(newItemRows(id, items!, ts));
  }
  touch();
  const row = await localDb.transactions.get(id);
  return row!;
}

export async function deleteExpense(id: string): Promise<void> {
  const ts = now();
  await localDb.transactions.update(id, { deletedAt: ts, updatedAt: ts });
  await tombstoneItems(id, ts);
  touch();
}

export async function listTransactions(args: { categoryId: string; ym: YearMonth }): Promise<LocalTransaction[]> {
  const { start, end } = monthRange(args.ym);
  const all = await localDb.transactions.where("categoryId").equals(args.categoryId).toArray();
  return all
    .filter((t) => t.deletedAt == null && t.occurredOn >= start && t.occurredOn < end)
    .sort(
      (a, b) =>
        (a.occurredOn < b.occurredOn ? 1 : a.occurredOn > b.occurredOn ? -1 : 0) ||
        (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0) ||
        b.id.localeCompare(a.id),
    );
}

// One-tap quick-fill: log an expense for the amount still needed to reach the
// category's monthly budget this period, dated today. No-op when nothing is due.
export async function markCategoryPaid(categoryId: string, ym: YearMonth): Promise<void> {
  const rows = await getCategoriesWithMonthTotals(ym);
  const row = rows.find((r) => r.category.id === categoryId);
  if (!row) return;
  const budget = row.category.monthlyBudget;
  const remaining = budget - row.spent;
  if (budget <= 0 || remaining <= 0) return;
  // Date the fill inside the month being paid (not literally today), so marking a
  // past/other month paid lands in THAT month — where `remaining` was computed —
  // instead of leaking into the current month. Current month still uses today.
  const d = new Date();
  const isCurrentMonth = d.getFullYear() === ym.year && d.getMonth() + 1 === ym.month;
  const occurredOn = isCurrentMonth
    ? d.toISOString().slice(0, 10)
    : `${ym.year}-${String(ym.month).padStart(2, "0")}-${String(new Date(ym.year, ym.month, 0).getDate()).padStart(2, "0")}`;
  await addExpense({ categoryId, amount: remaining, description: "Paid", occurredOn, paymentMethod: "cash" });
}

export async function getItemsByTransaction(txIds: string[]): Promise<Map<string, LocalExpenseItem[]>> {
  const map = new Map<string, LocalExpenseItem[]>();
  if (txIds.length === 0) return map;
  const rows = (await localDb.expenseItems.where("transactionId").anyOf(txIds).toArray())
    .filter((r) => r.deletedAt == null)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id.localeCompare(b.id)));
  for (const row of rows) {
    const list = map.get(row.transactionId);
    if (list) list.push(row);
    else map.set(row.transactionId, [row]);
  }
  return map;
}
