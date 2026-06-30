import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDb } from "@/lib/test/db";

describe("test db", () => {
  it("creates tables from migrations", async () => {
    const db = await createTestDb();
    const res = await db.execute(sql`select count(*)::int as n from categories`);
    expect((res.rows[0] as { n: number }).n).toBe(0);
  });
});
