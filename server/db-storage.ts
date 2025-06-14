import { eq, desc } from "drizzle-orm";
import { db as dbConnection, schema } from "./db";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  private activeSessionId: number | null = null;

  constructor() {
    if (!dbConnection) {
      throw new Error("Database connection not available");
    }
  }

  private getDb() {
    if (!dbConnection) {
      throw new Error("Database connection not available");
    }
    return dbConnection;
  }

  private convertWorkoutSession(dbSession: any): any {
    return {
      ...dbSession,
      exercises: dbSession.exercises || [],
      selectedDay: dbSession.selectedDay || undefined,
    };
  }

  private convertVideoUpload(dbVideo: any): any {
    return {
      ...dbVideo,
      uploadedAt: typeof dbVideo.uploadedAt === 'string' ? dbVideo.uploadedAt : dbVideo.uploadedAt.toISOString(),
    };
  }

  async createWorkoutSession(session: any): Promise<any> {
    const db = this.getDb();
    const [created] = await db.insert(schema.workoutSessions).values({
      pdfFilename: session.pdfFilename,
      selectedDay: session.selectedDay,
      exercises: session.exercises || [],
      workoutData: session.workoutData,
    }).returning();
    
    this.activeSessionId = created.id;
    return this.convertWorkoutSession(created);
  }

  async getWorkoutSession(id: number): Promise<any> {
    const db = this.getDb();
    const [session] = await db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));
    return session ? this.convertWorkoutSession(session) : undefined;
  }

  async updateWorkoutSession(id: number, updates: any): Promise<any> {
    const db = this.getDb();
    const [updated] = await db.update(schema.workoutSessions)
      .set(updates)
      .where(eq(schema.workoutSessions.id, id))
      .returning();
    return updated ? this.convertWorkoutSession(updated) : undefined;
  }

  async deleteWorkoutSession(id: number): Promise<boolean> {
    try {
      const db = this.getDb();
      await db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));
      return true;
    } catch {
      return false;
    }
  }

  async createVideoUpload(upload: any): Promise<any> {
    const db = this.getDb();
    const [created] = await db.insert(schema.videoUploads).values(upload).returning();
    return this.convertVideoUpload(created);
  }

  async getVideoUpload(id: number): Promise<any> {
    const db = this.getDb();
    const [video] = await db.select().from(schema.videoUploads).where(eq(schema.videoUploads.id, id));
    return video ? this.convertVideoUpload(video) : undefined;
  }

  async getVideosBySession(sessionId: number): Promise<any[]> {
    const db = this.getDb();
    const videos = await db.select()
      .from(schema.videoUploads)
      .where(eq(schema.videoUploads.sessionId, sessionId))
      .orderBy(desc(schema.videoUploads.uploadedAt));
    return videos.map(video => this.convertVideoUpload(video));
  }

  async deleteVideoUpload(id: number): Promise<boolean> {
    try {
      const db = this.getDb();
      await db.delete(schema.videoUploads).where(eq(schema.videoUploads.id, id));
      return true;
    } catch {
      return false;
    }
  }

  async updateVideoFilename(oldFilename: string, newFilename: string): Promise<boolean> {
    try {
      const db = this.getDb();
      await db.update(schema.videoUploads)
        .set({ filename: newFilename })
        .where(eq(schema.videoUploads.filename, oldFilename));
      return true;
    } catch {
      return false;
    }
  }

  async getCurrentSession(): Promise<any> {
    if (this.activeSessionId) {
      return this.getWorkoutSession(this.activeSessionId);
    }
    
    const db = this.getDb();
    const [recent] = await db.select()
      .from(schema.workoutSessions)
      .orderBy(desc(schema.workoutSessions.createdAt))
      .limit(1);
    
    if (recent) {
      this.activeSessionId = recent.id;
      return this.convertWorkoutSession(recent);
    }
    
    return undefined;
  }

  async setCurrentSession(sessionId: number): Promise<void> {
    this.activeSessionId = sessionId;
  }

  async clearCurrentSession(): Promise<void> {
    this.activeSessionId = null;
  }

  async clearAllData(): Promise<void> {
    const db = this.getDb();
    await db.delete(schema.videoUploads);
    await db.delete(schema.workoutSessions);
    this.activeSessionId = null;
  }
}