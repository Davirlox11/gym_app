import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Only create database connection if DATABASE_URL is properly configured
let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('postgresql://') || process.env.DATABASE_URL.includes('postgres://'))) {
  try {
    const connectionString = process.env.DATABASE_URL;
    const client = postgres(connectionString);
    db = drizzle(client, { schema });
  } catch (error) {
    console.warn("Failed to initialize database connection:", error);
    db = null;
  }
}

export { db };

export { schema };
export type { WorkoutSession, InsertWorkoutSession, VideoUpload, InsertVideoUpload } from "./schema";