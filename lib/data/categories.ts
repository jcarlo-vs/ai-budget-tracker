import { asc, eq } from "drizzle-orm";
import { categories, type Category } from "@/lib/db/schema";
import type { CategoryInput } from "@/lib/schemas";
import type { DB } from "@/lib/db/types";

export async function listCategories(db: DB): Promise<Category[]> {
  return db.select().from(categories)
    .where(eq(categories.archived, false))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

export async function createCategory(db: DB, input: CategoryInput): Promise<Category> {
  const [row] = await db.insert(categories).values(input).returning();
  return row;
}

export async function updateCategory(db: DB, id: number, input: CategoryInput): Promise<Category> {
  const [row] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
  return row;
}

export async function deleteCategory(db: DB, id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}
