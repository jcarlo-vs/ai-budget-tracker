import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  emoji: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  monthlyBudget: z.number().int().min(0),
});

export const expenseSchema = z.object({
  categoryId: z.string().min(1),
  amount: z.number().int().positive(),
  description: z.string().trim().max(140).default(""),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(["gcash", "cash", "bank_qr"]).optional(),
});

export const itemSchema = z.object({
  name: z.string().trim().min(1).max(60),
  amount: z.number().int().positive(), // centavos
});
export type ItemInput = z.infer<typeof itemSchema>;

export type CategoryInput = z.infer<typeof categorySchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const budgetSchema = z.object({
  year: z.number().int().min(1970).max(9999),
  month: z.number().int().min(1).max(12),
  amount: z.number().int().min(0),
});
export type BudgetInput = z.infer<typeof budgetSchema>;

// ─── Sync payload validation ────────────────────────────────────────────────
// Rows are validated leniently (the local layer is the source of truth) but
// fully enough that the parsed type matches the Local* row shapes, so the route
// can hand the data straight to the server sync ops without unsafe casts.
const auditFields = {
  id: z.string().min(1),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
};

const categoryRowSchema = z.object({
  ...auditFields,
  name: z.string(),
  emoji: z.string(),
  color: z.string(),
  monthlyBudget: z.number(),
  sortOrder: z.number(),
  archived: z.boolean(),
  createdAt: z.string(),
});

const transactionRowSchema = z.object({
  ...auditFields,
  categoryId: z.string(),
  amount: z.number(),
  description: z.string(),
  occurredOn: z.string(),
  paymentMethod: z.string(),
  createdAt: z.string(),
});

const expenseItemRowSchema = z.object({
  ...auditFields,
  transactionId: z.string(),
  name: z.string(),
  amount: z.number(),
  createdAt: z.string(),
});

const monthlyBudgetRowSchema = z.object({
  ...auditFields,
  year: z.number(),
  month: z.number(),
  amount: z.number(),
});

export const syncBodySchema = z.object({
  since: z.string(),
  changes: z.object({
    categories: z.array(categoryRowSchema),
    transactions: z.array(transactionRowSchema),
    expenseItems: z.array(expenseItemRowSchema),
    monthlyBudgets: z.array(monthlyBudgetRowSchema),
  }),
});
export type SyncBody = z.infer<typeof syncBodySchema>;
