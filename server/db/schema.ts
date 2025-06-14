import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const workoutSessions = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  pdfFilename: text("pdf_filename").notNull(),
  selectedDay: text("selected_day"),
  exercises: jsonb("exercises").notNull().default([]),
  workoutData: jsonb("workout_data"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const videoUploads = pgTable("video_uploads", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
  exerciseId: text("exercise_id").notNull(),
  weekId: text("week_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at", { mode: "string" }).notNull().defaultNow(),
});

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = typeof workoutSessions.$inferInsert;
export type VideoUpload = typeof videoUploads.$inferSelect;
export type InsertVideoUpload = typeof videoUploads.$inferInsert;