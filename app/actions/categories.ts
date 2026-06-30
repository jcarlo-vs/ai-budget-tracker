"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { categorySchema } from "@/lib/schemas";
import { parseAmountToCentavos } from "@/lib/money";
import { createCategory, updateCategory, deleteCategory } from "@/lib/data/categories";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

function readCategoryForm(form: FormData) {
  const budget = parseAmountToCentavos(String(form.get("monthlyBudget") ?? "0")) ?? 0;
  return categorySchema.safeParse({
    name: String(form.get("name") ?? ""),
    emoji: String(form.get("emoji") ?? "📦"),
    color: String(form.get("color") ?? "#10b981"),
    monthlyBudget: budget,
  });
}

export async function createCategoryAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = readCategoryForm(form);
  if (!parsed.success) return fail("Please check the category details");
  await createCategory(db, parsed.data);
  revalidatePath("/");
  revalidatePath("/categories");
  return ok();
}

export async function updateCategoryAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const id = idSchema.safeParse(form.get("id"));
  const parsed = readCategoryForm(form);
  if (!id.success || !parsed.success) return fail("Please check the category details");
  await updateCategory(db, id.data, parsed.data);
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/category/[id]", "page");
  return ok();
}

export async function deleteCategoryAction(form: FormData): Promise<void> {
  const id = idSchema.safeParse(form.get("id"));
  if (id.success) {
    await deleteCategory(db, id.data);
    revalidatePath("/");
    revalidatePath("/categories");
    revalidatePath("/category/[id]", "page");
  }
}
