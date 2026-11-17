CREATE TABLE "letters" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"text_enc" text NOT NULL,
	"written_on" date NOT NULL,
	"unlock_on" date NOT NULL,
	"opened_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "letters_user_idx" ON "letters" USING btree ("user_id","unlock_on");