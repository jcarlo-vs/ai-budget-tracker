"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { budgetSchema } from "@/lib/schemas";
import { parseAmountToCentavos } from "@/lib/money";
import { setMonthlyBudget, deleteMonthlyBudget } from "@/lib/data/budgets";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const periodSchema = z.object({
  year: z.coerce.number().int().min(1970).max(9999),
  month: z.coerce.number().int().min(1).max(12),
});

export async function setMonthlyBudgetAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const amount = parseAmountToCentavos(String(form.get("amount") ?? ""));
  const parsed = budgetSchema.safeParse({
    year: Number(form.get("year")),
    month: Number(form.get("month")),
    amount: amount ?? -1,
  });
  if (!parsed.success) return fail("Enter a valid budget amount");
  await setMonthlyBudget(db, { year: parsed.data.year, month: parsed.data.month }, parsed.data.amount);
  revalidatePath("/");
  revalidatePath("/savings");
  revalidatePath("/categories");
  return ok();
}

export async function clearMonthlyBudgetAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = periodSchema.safeParse({
    year: form.get("year"),
    month: form.get("month"),
  });
  if (!parsed.success) return fail("Invalid month");
  await deleteMonthlyBudget(db, { year: parsed.data.year, month: parsed.data.month });
  revalidatePath("/");
  revalidatePath("/savings");
  revalidatePath("/categories");
  return ok();
}
