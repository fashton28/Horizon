CREATE TABLE "interview_session" (
	"id" text PRIMARY KEY NOT NULL,
	"call_id" text NOT NULL,
	"user_id" text NOT NULL,
	"interview_type" text NOT NULL,
	"language" text NOT NULL,
	"voice" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_session_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
ALTER TABLE "interview_session" ADD CONSTRAINT "interview_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interview_session_userId_idx" ON "interview_session" USING btree ("user_id");