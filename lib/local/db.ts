import Dexie, { type Table } from "dexie";
import type {
  LocalCategory, LocalTransaction, LocalExpenseItem, LocalMonthlyBudget,
} from "@/lib/local/types";

export interface MetaRow { key: string; value: string }

class BudgetDB extends Dexie {
  categories!: Table<LocalCategory, string>;
  transactions!: Table<LocalTransaction, string>;
  expenseItems!: Table<LocalExpenseItem, string>;
  monthlyBudgets!: Table<LocalMonthlyBudget, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("budget-tracker");
    this.version(1).stores({
      categories: "id, sortOrder, updatedAt, deletedAt",
      transactions: "id, categoryId, occurredOn, updatedAt, deletedAt",
      expenseItems: "id, transactionId, updatedAt, deletedAt",
      monthlyBudgets: "id, [year+month], updatedAt, deletedAt",
      meta: "key",
    });
  }
}

export const localDb = typeof indexedDB !== "undefined" ? new BudgetDB() : (undefined as unknown as BudgetDB);

export async function getMeta(key: string): Promise<string | undefined> {
  return (await localDb.meta.get(key))?.value;
}
export async function setMeta(key: string, value: string): Promise<void> {
  await localDb.meta.put({ key, value });
}
