-- Initial migration for CoachSheet database
CREATE TABLE IF NOT EXISTS "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"pdf_filename" text NOT NULL,
	"selected_day" text,
	"exercises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"workout_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "video_uploads" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"week_id" text NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "video_uploads" ADD CONSTRAINT "video_uploads_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE cascade ON UPDATE no action;