import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { transactions, expenseItems, type Transaction, type ExpenseItem } from "@/lib/db/schema";
import type { ExpenseInput, ItemInput } from "@/lib/schemas";
import type { DB } from "@/lib/db/types";
import { monthRange, type YearMonth } from "@/lib/month";

export type TransactionWithItems = Transaction & { items: ExpenseItem[] };

function sumItems(items: ItemInput[]): number {
  return items.reduce((acc, i) => acc + i.amount, 0);
}

// neon-http (prod) does NOT support interactive db.transaction() — we can't read
// an inserted id mid-transaction. So we do sequential awaited inserts. The
// transaction's amount is set to the item sum up front, so the category rollup
// stays correct even if the item inserts partially fail.
export async function addExpense(db: DB, input: ExpenseInput, items?: ItemInput[]): Promise<Transaction> {
  const itemized = items != null && items.length > 0;
  const values = itemized ? { ...input, amount: sumItems(items!) } : input;
  const [row] = await db.insert(transactions).values(values).returning();
  if (itemized) {
    await db.insert(expenseItems).values(
      items!.map((i) => ({ transactionId: row.id, name: i.name, amount: i.amount })),
    );
  }
  return row;
}

export async function updateExpense(db: DB, id: number, input: ExpenseInput, items?: ItemInput[]): Promise<Transaction> {
  // items === undefined → leave items as-is, use input.amount (back-compat).
  // items === []         → clear items, use input.amount.
  // items has entries    → replace items, amount = sum(items).
  const replacing = items !== undefined;
  const itemized = replacing && items!.length > 0;
  const values = itemized ? { ...input, amount: sumItems(items!) } : input;
  const [row] = await db.update(transactions).set(values).where(eq(transactions.id, id)).returning();
  if (replacing) {
    await db.delete(expenseItems).where(eq(expenseItems.transactionId, id));
    if (itemized) {
      await db.insert(expenseItems).values(
        items!.map((i) => ({ transactionId: id, name: i.name, amount: i.amount })),
      );
    }
  }
  return row;
}

export async function deleteExpense(db: DB, id: number): Promise<void> {
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function listTransactions(
  db: DB,
  args: { categoryId: number; ym: YearMonth },
): Promise<Transaction[]> {
  const { start, end } = monthRange(args.ym);
  return db.select().from(transactions)
    .where(and(
      eq(transactions.categoryId, args.categoryId),
      gte(transactions.occurredOn, start),
      lt(transactions.occurredOn, end),
    ))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id));
}

export async function getItemsByTransaction(db: DB, txIds: number[]): Promise<Map<number, ExpenseItem[]>> {
  const map = new Map<number, ExpenseItem[]>();
  if (txIds.length === 0) return map;
  const rows = await db.select().from(expenseItems)
    .where(inArray(expenseItems.transactionId, txIds))
    .orderBy(asc(expenseItems.id));
  for (const row of rows) {
    const list = map.get(row.transactionId);
    if (list) list.push(row);
    else map.set(row.transactionId, [row]);
  }
  return map;
}
