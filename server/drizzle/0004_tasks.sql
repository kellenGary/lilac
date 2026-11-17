CREATE TABLE "task_marks" (
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"mood" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_marks_mood" CHECK ("task_marks"."mood" is null or "task_marks"."mood" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title_enc" text NOT NULL,
	"kind" text NOT NULL,
	"theme" text,
	"created_on" date NOT NULL,
	"on_date" date,
	"exp_start" date,
	"exp_days" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_kind" CHECK ("tasks"."kind" in ('daily', 'once'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_marks_task_day_idx" ON "task_marks" USING btree ("task_id","day");--> statement-breakpoint
CREATE INDEX "task_marks_user_idx" ON "task_marks" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX "tasks_user_idx" ON "tasks" USING btree ("user_id");