import { and, desc, eq, gte, lt } from "drizzle-orm";
import { transactions, type Transaction } from "@/lib/db/schema";
import type { ExpenseInput } from "@/lib/schemas";
import type { DB } from "@/lib/db/types";
import { monthRange, type YearMonth } from "@/lib/month";

export async function addExpense(db: DB, input: ExpenseInput): Promise<Transaction> {
  const [row] = await db.insert(transactions).values(input).returning();
  return row;
}

export async function updateExpense(db: DB, id: number, input: ExpenseInput): Promise<Transaction> {
  const [row] = await db.update(transactions).set(input).where(eq(transactions.id, id)).returning();
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
