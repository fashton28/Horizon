CREATE TABLE "session_summary" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"overall_summary" text NOT NULL,
	"strengths" text NOT NULL,
	"areas_for_improvement" text NOT NULL,
	"actionable_next_steps" text NOT NULL,
	"overall_score" integer,
	"model_used" text DEFAULT 'gemini-1.5-flash',
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_summary_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "session_transcript" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"speaker" text NOT NULL,
	"text" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_session" ADD COLUMN "summary_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "interview_session" ADD COLUMN "full_transcript" text;--> statement-breakpoint
ALTER TABLE "session_summary" ADD CONSTRAINT "session_summary_session_id_interview_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_transcript" ADD CONSTRAINT "session_transcript_session_id_interview_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_summary_sessionId_idx" ON "session_summary" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_transcript_sessionId_idx" ON "session_transcript" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_transcript_sequence_idx" ON "session_transcript" USING btree ("session_id","sequence_number");