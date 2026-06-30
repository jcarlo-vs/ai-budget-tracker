export interface LocalCategory {
  id: string; name: string; emoji: string; color: string;
  monthlyBudget: number; sortOrder: number; archived: boolean;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export interface LocalTransaction {
  id: string; categoryId: string; amount: number; description: string;
  occurredOn: string; paymentMethod: string;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export interface LocalExpenseItem {
  id: string; transactionId: string; name: string; amount: number;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}
export interface LocalMonthlyBudget {
  id: string; year: number; month: number; amount: number;
  updatedAt: string; deletedAt: string | null;
}
export type SyncTable = "categories" | "transactions" | "expenseItems" | "monthlyBudgets";
