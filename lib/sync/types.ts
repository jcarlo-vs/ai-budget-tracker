import type {
  LocalCategory, LocalTransaction, LocalExpenseItem, LocalMonthlyBudget,
} from "@/lib/local/types";

export interface SyncChanges {
  categories: LocalCategory[];
  transactions: LocalTransaction[];
  expenseItems: LocalExpenseItem[];
  monthlyBudgets: LocalMonthlyBudget[];
}

export interface SyncRequestBody {
  since: string;
  changes: SyncChanges;
}

export interface SyncResponse {
  rows: SyncChanges;
  now: string;
}
