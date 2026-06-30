import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// Satisfied by both neon-http and pglite drizzle instances.
export type DB = PgDatabase<any, typeof schema>;
