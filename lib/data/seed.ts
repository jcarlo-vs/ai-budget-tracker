import type { DB } from "@/lib/db/types";
import { listCategories, createCategory } from "@/lib/data/categories";
import type { CategoryInput } from "@/lib/schemas";

const STARTERS: CategoryInput[] = [
  { name: "Food", emoji: "🍜", color: "#10b981", monthlyBudget: 0 },
  { name: "Transport", emoji: "🚌", color: "#3b82f6", monthlyBudget: 0 },
  { name: "Bills", emoji: "🧾", color: "#f59e0b", monthlyBudget: 0 },
  { name: "Fun", emoji: "🎮", color: "#8b5cf6", monthlyBudget: 0 },
];

export async function ensureSeedCategories(db: DB): Promise<void> {
  const existing = await listCategories(db);
  if (existing.length > 0) return;
  for (const s of STARTERS) await createCategory(db, s);
}
