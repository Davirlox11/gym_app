import { InsertWorkoutSession, InsertVideoUpload } from "../shared/schema";
import type { WorkoutSession, VideoUpload } from "../shared/schema";

export interface IStorage {
  // Workout Sessions
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  getWorkoutSession(id: number): Promise<WorkoutSession | undefined>;
  updateWorkoutSession(id: number, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined>;
  deleteWorkoutSession(id: number): Promise<boolean>;
  
  // Video Uploads
  createVideoUpload(upload: InsertVideoUpload): Promise<VideoUpload>;
  getVideoUpload(id: number): Promise<VideoUpload | undefined>;
  getVideosBySession(sessionId: number): Promise<VideoUpload[]>;
  deleteVideoUpload(id: number): Promise<boolean>;
  updateVideoFilename(oldFilename: string, newFilename: string): Promise<boolean>;
  
  // Current session management
  getCurrentSession(): Promise<WorkoutSession | undefined>;
  setCurrentSession(sessionId: number): Promise<void>;
  clearCurrentSession(): Promise<void>;
  clearAllData(): Promise<void>;
}

export class MemStorage implements IStorage {
  private sessions: Map<number, WorkoutSession>;
  private videos: Map<number, VideoUpload>;
  private currentSessionId: number = 1;
  private currentVideoId: number = 1;
  private activeSessionId: number | null = null;

  constructor() {
    this.sessions = new Map();
    this.videos = new Map();
  }

  async createWorkoutSession(session: InsertWorkoutSession & {workoutData?: any}): Promise<WorkoutSession & {workoutData?: any}> {
    const workoutSession: WorkoutSession & {workoutData?: any} = {
      id: this.currentSessionId++,
      pdfFilename: session.pdfFilename,
      selectedDay: session.selectedDay,
      exercises: session.exercises || [],
      workoutData: session.workoutData,
      createdAt: new Date().toISOString(),
    };
    
    this.sessions.set(workoutSession.id, workoutSession);
    this.activeSessionId = workoutSession.id;
    return workoutSession;
  }

  async getWorkoutSession(id: number): Promise<WorkoutSession | undefined> {
    return this.sessions.get(id);
  }

  async updateWorkoutSession(id: number, updates: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteWorkoutSession(id: number): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async createVideoUpload(upload: InsertVideoUpload): Promise<VideoUpload> {
    const videoUpload: VideoUpload = {
      id: this.currentVideoId++,
      sessionId: upload.sessionId,
      exerciseId: upload.exerciseId,
      weekId: upload.weekId,
      filename: upload.filename,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      size: upload.size,
      uploadedAt: new Date().toISOString(),
    };
    
    this.videos.set(videoUpload.id, videoUpload);
    return videoUpload;
  }

  async getVideoUpload(id: number): Promise<VideoUpload | undefined> {
    return this.videos.get(id);
  }

  async getVideosBySession(sessionId: number): Promise<VideoUpload[]> {
    return Array.from(this.videos.values()).filter(video => video.sessionId === sessionId);
  }

  async deleteVideoUpload(id: number): Promise<boolean> {
    return this.videos.delete(id);
  }

  async updateVideoFilename(oldFilename: string, newFilename: string): Promise<boolean> {
    for (const video of this.videos.values()) {
      if (video.filename === oldFilename) {
        video.filename = newFilename;
        return true;
      }
    }
    return false;
  }

  async getCurrentSession(): Promise<WorkoutSession | undefined> {
    if (!this.activeSessionId) return undefined;
    return this.sessions.get(this.activeSessionId);
  }

  async setCurrentSession(sessionId: number): Promise<void> {
    this.activeSessionId = sessionId;
  }

  async clearCurrentSession(): Promise<void> {
    this.activeSessionId = null;
  }

  async clearAllData(): Promise<void> {
    this.sessions.clear();
    this.videos.clear();
    this.activeSessionId = null;
    this.currentSessionId = 1;
    this.currentVideoId = 1;
  }
}

import { DatabaseStorage } from "./db-storage";

// Storage initialization with database fallback
async function createStorage(): Promise<IStorage> {
  try {
    const dbUrl = process.env.DATABASE_URL;
    console.log("DATABASE_URL present:", !!dbUrl);
    console.log("DATABASE_URL prefix:", dbUrl ? dbUrl.substring(0, 15) : "none");
    
    if (dbUrl && (dbUrl.includes('postgresql://') || dbUrl.includes('postgres://') || dbUrl.startsWith('postgres'))) {
      console.log("DATABASE_URL format appears valid, testing connection...");
      
      try {
        const { DatabaseStorage } = await import("./db-storage.js");
        const testStorage = new DatabaseStorage();
        // Test connection by attempting to get current session
        await testStorage.getCurrentSession();
        console.log("Database connection successful, using PostgreSQL storage");
        return testStorage;
      } catch (dbError: any) {
        console.warn("Database connection failed:", dbError?.message || 'Unknown error');
        console.log("Falling back to in-memory storage");
        return new MemStorage();
      }
    } else {
      console.log("DATABASE_URL not configured properly, using in-memory storage");
      console.log("Expected format: postgresql://... or postgres://...");
      return new MemStorage();
    }
  } catch (error: any) {
    console.warn("Storage initialization error:", error?.message || 'Unknown error');
    return new MemStorage();
  }
}

// Initialize storage
export let storage: IStorage;

async function initializeStorage() {
  try {
    storage = await createStorage();
    console.log("Storage initialized:", storage.constructor.name);
  } catch (error) {
    console.error("Failed to initialize storage:", error);
    storage = new MemStorage();
    console.log("Fallback to MemStorage");
  }
}

// Initialize storage immediately
await initializeStorage();