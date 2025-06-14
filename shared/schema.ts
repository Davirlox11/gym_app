import { z } from "zod";

// Types for exercises and workout data
export interface Exercise {
  id: string;
  name: string;
  setsReps: string;
  weeks: {
    [weekId: string]: {
      weight?: string;
      video?: {
        id: string;
        filename: string;
        originalName: string;
      };
      rpe?: number;
    };
  };
  notes?: string;
}

export interface PDFPage {
  pageNumber: number;
  title: string;
  description?: string;
  exercises: Exercise[];
}

export interface WorkoutDay {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
}

// Base schema definitions using zod for in-memory storage
export const insertWorkoutSessionSchema = z.object({
  pdfFilename: z.string(),
  selectedDay: z.string().optional(),
  exercises: z.array(z.any()).default([]),
  workoutData: z.any().optional(),
});

export const insertVideoUploadSchema = z.object({
  sessionId: z.number(),
  exerciseId: z.string(),
  weekId: z.string(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

// Type definitions for in-memory storage
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type InsertVideoUpload = z.infer<typeof insertVideoUploadSchema>;

export interface WorkoutSession {
  id: number;
  pdfFilename: string;
  selectedDay?: string | null;
  exercises: Exercise[];
  workoutData?: any;
  createdAt: string;
}

export interface VideoUpload {
  id: number;
  sessionId: number;
  exerciseId: string;
  weekId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}
