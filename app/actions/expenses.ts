"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { expenseSchema, itemSchema, type ItemInput } from "@/lib/schemas";
import { parseAmountToCentavos } from "@/lib/money";
import { addExpense, updateExpense, deleteExpense } from "@/lib/data/transactions";
import { getCategoriesWithMonthTotals } from "@/lib/data/overview";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();
const yearSchema = z.coerce.number().int().min(1970).max(9999);
const monthSchema = z.coerce.number().int().min(1).max(12);

// The expense sheet submits line items as a hidden JSON field. Be defensive:
// malformed JSON or non-array → treat as no items; keep only items that validate.
function parseItems(form: FormData): ItemInput[] {
  const raw = form.get("items");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const items: ItemInput[] = [];
  for (const entry of data) {
    const parsed = itemSchema.safeParse(entry);
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}

function readExpenseForm(form: FormData) {
  const items = parseItems(form);
  // With ≥1 valid items the amount is the item sum; otherwise the single field.
  const amount = items.length > 0
    ? items.reduce((acc, i) => acc + i.amount, 0)
    : (parseAmountToCentavos(String(form.get("amount") ?? "")) ?? 0);
  const parsed = expenseSchema.safeParse({
    categoryId: Number(form.get("categoryId")),
    amount,
    description: String(form.get("description") ?? ""),
    occurredOn: String(form.get("occurredOn") ?? ""),
    paymentMethod: String(form.get("paymentMethod") || "cash"),
  });
  return { parsed, items };
}

export async function addExpenseAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { parsed, items } = readExpenseForm(form);
  if (!parsed.success) return fail("Enter a valid amount and category");
  await addExpense(db, parsed.data, items);
  revalidatePath("/");
  revalidatePath(`/category/${parsed.data.categoryId}`);
  return ok();
}

export async function updateExpenseAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(form.get("id"));
  const { parsed, items } = readExpenseForm(form);
  if (!id.success || !parsed.success) return fail("Enter a valid amount and category");
  await updateExpense(db, id.data, parsed.data, items);
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

// One-tap quick-fill: log an expense for the amount still needed to reach the
// category's monthly budget this period, dated today. Great for fixed bills.
export async function markCategoryPaidAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const categoryId = idSchema.safeParse(form.get("categoryId"));
  const year = yearSchema.safeParse(form.get("year"));
  const month = monthSchema.safeParse(form.get("month"));
  if (!categoryId.success || !year.success || !month.success) return fail("Invalid request");

  const rows = await getCategoriesWithMonthTotals(db, { year: year.data, month: month.data });
  const row = rows.find((r) => r.category.id === categoryId.data);
  if (!row) return fail("Category not found");

  const budget = row.category.monthlyBudget;
  const remaining = budget - row.spent;
  if (budget <= 0 || remaining <= 0) return fail("Nothing to pay");

  const today = new Date().toISOString().slice(0, 10);
  await addExpense(db, {
    categoryId: categoryId.data,
    amount: remaining,
    description: "Paid",
    occurredOn: today,
    paymentMethod: "cash",
  });

  revalidatePath("/");
  revalidatePath("/savings");
  revalidatePath(`/category/${categoryId.data}`);
  return ok();
}
