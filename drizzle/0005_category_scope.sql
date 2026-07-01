-- categories: add nullable month-scope columns (permanent = null/null, temporary = year+month)
ALTER TABLE "categories" ADD COLUMN "scope_year" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "scope_month" integer;
