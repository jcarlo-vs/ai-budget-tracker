"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { expenseSchema } from "@/lib/schemas";
import { parseAmountToCentavos } from "@/lib/money";
import { addExpense, updateExpense, deleteExpense } from "@/lib/data/transactions";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

function readExpenseForm(form: FormData) {
  const amount = parseAmountToCentavos(String(form.get("amount") ?? ""));
  return expenseSchema.safeParse({
    categoryId: Number(form.get("categoryId")),
    amount: amount ?? 0,
    description: String(form.get("description") ?? ""),
    occurredOn: String(form.get("occurredOn") ?? ""),
    paymentMethod: String(form.get("paymentMethod") || "cash"),
  });
}

export async function addExpenseAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = readExpenseForm(form);
  if (!parsed.success) return fail("Enter a valid amount and category");
  await addExpense(db, parsed.data);
  revalidatePath("/");
  revalidatePath(`/category/${parsed.data.categoryId}`);
  return ok();
}

export async function updateExpenseAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(form.get("id"));
  const parsed = readExpenseForm(form);
  if (!id.success || !parsed.success) return fail("Enter a valid amount and category");
  await updateExpense(db, id.data, parsed.data);
  revalidatePath("/");
  revalidatePath(`/category/${parsed.data.categoryId}`);
  return ok();
}

export async function deleteExpenseAction(form: FormData): Promise<void> {
  const id = idSchema.safeParse(form.get("id"));
  const categoryId = Number(form.get("categoryId"));
  if (id.success) {
    await deleteExpense(db, id.data);
    revalidatePath("/");
    if (Number.isInteger(categoryId)) revalidatePath(`/category/${categoryId}`);
  }
}
