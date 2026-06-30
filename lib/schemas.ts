import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(50),
  emoji: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  monthlyBudget: z.number().int().min(0),
});

export const expenseSchema = z.object({
  categoryId: z.number().int().positive(),
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
