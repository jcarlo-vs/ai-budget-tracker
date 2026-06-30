CREATE TABLE "monthly_budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"amount" integer NOT NULL,
	CONSTRAINT "monthly_budgets_year_month_unique" UNIQUE("year","month")
);
