import { localDb } from "@/lib/local/db";
import { touch } from "@/lib/local/touch";
import type { LocalCategory } from "@/lib/local/types";
import type { CategoryInput } from "@/lib/schemas";
import type { YearMonth } from "@/lib/month";

const now = () => new Date().toISOString();

// Active, non-archived categories, ordered by sortOrder then createdAt (insertion
// order), with id only as a final, stable tiebreak. Sorting by createdAt keeps the
// order intact after the uuid migration (ids are random, so they can't carry order).
export async function listCategories(): Promise<LocalCategory[]> {
  const all = await localDb.categories.toArray();
  return all
    .filter((c) => c.deletedAt == null && !c.archived)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}

// A category shows in a month when it is permanent (no scope) or when its scope
// matches that exact month. This is the single source of truth for the filter.
export function visibleInMonth(
  category: Pick<LocalCategory, "scopeYear" | "scopeMonth">,
  ym: YearMonth,
): boolean {
  return (
    category.scopeYear == null ||
    (category.scopeYear === ym.year && category.scopeMonth === ym.month)
  );
}

// Active categories visible in the given month (permanent + this-month temporary),
// preserving the same ordering as listCategories.
export async function listCategoriesForMonth(ym: YearMonth): Promise<LocalCategory[]> {
  return (await listCategories()).filter((c) => visibleInMonth(c, ym));
}

export async function createCategory(
  input: CategoryInput,
  scope?: { year: number; month: number },
): Promise<LocalCategory> {
  const ts = now();
  const row: LocalCategory = {
    id: crypto.randomUUID(),
    sortOrder: 0,
    archived: false,
    scopeYear: scope?.year ?? null,
    scopeMonth: scope?.month ?? null,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
    ...input,
  };
  await localDb.categories.put(row);
  touch();
  return row;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  await localDb.categories.update(id, { ...input, updatedAt: now() });
  touch();
}

export async function deleteCategory(id: string): Promise<void> {
  const ts = now();
  await localDb.categories.update(id, { deletedAt: ts, updatedAt: ts });
  touch();
}
