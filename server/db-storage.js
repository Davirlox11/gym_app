import { eq, desc } from "drizzle-orm";
import { db as dbConnection, schema } from "./db/index.js";

export class DatabaseStorage {
  constructor() {
    this.activeSessionId = null;
    if (!dbConnection) {
      throw new Error("Database connection not available");
    }
  }

  getDb() {
    if (!dbConnection) {
      throw new Error("Database connection not available");
    }
    return dbConnection;
  }

  convertWorkoutSession(dbSession) {
    return {
      ...dbSession,
      exercises: dbSession.exercises || [],
      selectedDay: dbSession.selectedDay || undefined,
    };
  }

  convertVideoUpload(dbVideo) {
    return {
      ...dbVideo,
      uploadedAt: typeof dbVideo.uploadedAt === 'string' ? dbVideo.uploadedAt : dbVideo.uploadedAt.toISOString(),
    };
  }

  async createWorkoutSession(session) {
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

  async getWorkoutSession(id) {
    const db = this.getDb();
    const [session] = await db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));
    return session ? this.convertWorkoutSession(session) : undefined;
  }

  async updateWorkoutSession(id, updates) {
    const db = this.getDb();
    const [updated] = await db.update(schema.workoutSessions)
      .set(updates)
      .where(eq(schema.workoutSessions.id, id))
      .returning();
    return updated ? this.convertWorkoutSession(updated) : undefined;
  }

  async deleteWorkoutSession(id) {
    try {
      const db = this.getDb();
      await db.delete(schema.workoutSessions).where(eq(schema.workoutSessions.id, id));
      return true;
    } catch {
      return false;
    }
  }

  async createVideoUpload(upload) {
    const db = this.getDb();
    const [created] = await db.insert(schema.videoUploads).values(upload).returning();
    return this.convertVideoUpload(created);
  }

  async getVideoUpload(id) {
    const db = this.getDb();
    const [video] = await db.select().from(schema.videoUploads).where(eq(schema.videoUploads.id, id));
    return video ? this.convertVideoUpload(video) : undefined;
  }

  async getVideosBySession(sessionId) {
    const db = this.getDb();
    const videos = await db.select()
      .from(schema.videoUploads)
      .where(eq(schema.videoUploads.sessionId, sessionId))
      .orderBy(desc(schema.videoUploads.uploadedAt));
    return videos.map(video => this.convertVideoUpload(video));
  }

  async deleteVideoUpload(id) {
    try {
      const db = this.getDb();
      await db.delete(schema.videoUploads).where(eq(schema.videoUploads.id, id));
      return true;
    } catch {
      return false;
    }
  }

  async updateVideoFilename(oldFilename, newFilename) {
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

  async getCurrentSession() {
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

  async setCurrentSession(sessionId) {
    this.activeSessionId = sessionId;
  }

  async clearCurrentSession() {
    this.activeSessionId = null;
  }

  async clearAllData() {
    const db = this.getDb();
    await db.delete(schema.videoUploads);
    await db.delete(schema.workoutSessions);
    this.activeSessionId = null;
  }
}