import { pgTable, text, integer, boolean, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const audit = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("📦"),
  color: text("color").notNull().default("#0a84ff"),
  monthlyBudget: integer("monthly_budget").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  // Month scope: null/null = permanent (shows every month); a concrete year+month
  // = temporary (visible only in that one month). Nullable + backward-compatible.
  scopeYear: integer("scope_year"),
  scopeMonth: integer("scope_month"),
  ...audit,
});

export const transactions = pgTable("transactions", {
  id: id(),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  description: text("description").notNull().default(""),
  occurredOn: date("occurred_on").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  ...audit,
});

export const expenseItems = pgTable("expense_items", {
  id: id(),
  transactionId: text("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: integer("amount").notNull(), // centavos
  ...audit,
});

export const monthlyBudgets = pgTable(
  "monthly_budgets",
  {
    id: id(),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1..12
    amount: integer("amount").notNull(), // centavos
    ...audit,
  },
  (t) => [
    uniqueIndex("monthly_budgets_year_month_active").on(t.year, t.month).where(sql`${t.deletedAt} is null`),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type ExpenseItem = typeof expenseItems.$inferSelect;
export type NewExpenseItem = typeof expenseItems.$inferInsert;
export type MonthlyBudget = typeof monthlyBudgets.$inferSelect;
export type NewMonthlyBudget = typeof monthlyBudgets.$inferInsert;
