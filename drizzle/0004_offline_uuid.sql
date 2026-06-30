-- categories: add uuid id + audit
ALTER TABLE "categories" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
-- transactions: add uuid id + uuid fk + audit
ALTER TABLE "transactions" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "category_id_uuid" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "transactions" t SET "category_id_uuid" = c."id_uuid" FROM "categories" c WHERE t."category_id" = c."id";--> statement-breakpoint
-- expense_items: add uuid id + uuid fk + audit
ALTER TABLE "expense_items" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_items" ADD COLUMN "transaction_id_uuid" text;--> statement-breakpoint
ALTER TABLE "expense_items" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_items" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "expense_items" e SET "transaction_id_uuid" = t."id_uuid" FROM "transactions" t WHERE e."transaction_id" = t."id";--> statement-breakpoint
-- monthly_budgets: add uuid id + audit
ALTER TABLE "monthly_budgets" ADD COLUMN "id_uuid" text DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- drop old FKs + PKs, swap columns
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "expense_items" DROP CONSTRAINT IF EXISTS "expense_items_transaction_id_transactions_id_fk";--> statement-breakpoint
ALTER TABLE "monthly_budgets" DROP CONSTRAINT IF EXISTS "monthly_budgets_year_month_unique";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_pkey";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_pkey";--> statement-breakpoint
ALTER TABLE "expense_items" DROP CONSTRAINT "expense_items_pkey";--> statement-breakpoint
ALTER TABLE "monthly_budgets" DROP CONSTRAINT "monthly_budgets_pkey";--> statement-breakpoint
ALTER TABLE "categories" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "categories" RENAME COLUMN "id_uuid" TO "id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "id_uuid" TO "id";--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "category_id";--> statement-breakpoint
ALTER TABLE "transactions" RENAME COLUMN "category_id_uuid" TO "category_id";--> statement-breakpoint
ALTER TABLE "expense_items" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "expense_items" RENAME COLUMN "id_uuid" TO "id";--> statement-breakpoint
ALTER TABLE "expense_items" DROP COLUMN "transaction_id";--> statement-breakpoint
ALTER TABLE "expense_items" RENAME COLUMN "transaction_id_uuid" TO "transaction_id";--> statement-breakpoint
ALTER TABLE "monthly_budgets" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "monthly_budgets" RENAME COLUMN "id_uuid" TO "id";--> statement-breakpoint
-- re-add PKs, FKs, partial unique index, NOT NULLs
ALTER TABLE "categories" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "expense_items" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "expense_items" ALTER COLUMN "transaction_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ADD PRIMARY KEY ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "monthly_budgets_year_month_active" ON "monthly_budgets" ("year","month") WHERE "deleted_at" is null;--> statement-breakpoint
-- drop the temporary DB-level uuid defaults: ids come from the client-side $defaultFn, not the DB
ALTER TABLE "categories" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "expense_items" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "monthly_budgets" ALTER COLUMN "id" DROP DEFAULT;
