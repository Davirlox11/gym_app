import { db } from "./db";
import { sql } from "drizzle-orm";

async function migrate() {
  try {
    console.log("Running database migrations...");

    // Create workout_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id SERIAL PRIMARY KEY,
        pdf_filename TEXT NOT NULL,
        selected_day TEXT,
        exercises JSONB DEFAULT '[]'::jsonb NOT NULL,
        workout_data JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create video_uploads table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS video_uploads (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,
        week_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log("Database migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();