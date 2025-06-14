var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  videoUploads: () => videoUploads,
  workoutSessions: () => workoutSessions
});
import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
var workoutSessions, videoUploads;
var init_schema = __esm({
  "server/db/schema.ts"() {
    workoutSessions = pgTable("workout_sessions", {
      id: serial("id").primaryKey(),
      pdfFilename: text("pdf_filename").notNull(),
      selectedDay: text("selected_day"),
      exercises: jsonb("exercises").notNull().default([]),
      workoutData: jsonb("workout_data"),
      createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow()
    });
    videoUploads = pgTable("video_uploads", {
      id: serial("id").primaryKey(),
      sessionId: integer("session_id").notNull().references(() => workoutSessions.id, { onDelete: "cascade" }),
      exerciseId: text("exercise_id").notNull(),
      weekId: text("week_id").notNull(),
      filename: text("filename").notNull(),
      originalName: text("original_name").notNull(),
      mimeType: text("mime_type").notNull(),
      size: integer("size").notNull(),
      uploadedAt: timestamp("uploaded_at", { mode: "string" }).notNull().defaultNow()
    });
  }
});

// server/db/index.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  schema: () => schema_exports
});
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
var db;
var init_db = __esm({
  "server/db/index.ts"() {
    init_schema();
    db = null;
    if (process.env.DATABASE_URL && (process.env.DATABASE_URL.includes("postgresql://") || process.env.DATABASE_URL.includes("postgres://"))) {
      try {
        const connectionString = process.env.DATABASE_URL;
        const client = postgres(connectionString);
        db = drizzle(client, { schema: schema_exports });
      } catch (error) {
        console.warn("Failed to initialize database connection:", error);
        db = null;
      }
    }
  }
});

// server/db-storage.ts
var db_storage_exports = {};
__export(db_storage_exports, {
  DatabaseStorage: () => DatabaseStorage
});
import { eq, desc } from "drizzle-orm";
var DatabaseStorage;
var init_db_storage = __esm({
  "server/db-storage.ts"() {
    init_db();
    DatabaseStorage = class {
      constructor() {
        this.activeSessionId = null;
        if (!db) {
          throw new Error("Database connection not available");
        }
      }
      getDb() {
        if (!db) {
          throw new Error("Database connection not available");
        }
        return db;
      }
      convertWorkoutSession(dbSession) {
        return {
          ...dbSession,
          exercises: dbSession.exercises || [],
          selectedDay: dbSession.selectedDay || void 0
        };
      }
      convertVideoUpload(dbVideo) {
        return {
          ...dbVideo,
          uploadedAt: typeof dbVideo.uploadedAt === "string" ? dbVideo.uploadedAt : dbVideo.uploadedAt.toISOString()
        };
      }
      async createWorkoutSession(session) {
        const db2 = this.getDb();
        const [created] = await db2.insert(schema_exports.workoutSessions).values({
          pdfFilename: session.pdfFilename,
          selectedDay: session.selectedDay,
          exercises: session.exercises || [],
          workoutData: session.workoutData
        }).returning();
        this.activeSessionId = created.id;
        return this.convertWorkoutSession(created);
      }
      async getWorkoutSession(id) {
        const db2 = this.getDb();
        const [session] = await db2.select().from(schema_exports.workoutSessions).where(eq(schema_exports.workoutSessions.id, id));
        return session ? this.convertWorkoutSession(session) : void 0;
      }
      async updateWorkoutSession(id, updates) {
        const db2 = this.getDb();
        const [updated] = await db2.update(schema_exports.workoutSessions).set(updates).where(eq(schema_exports.workoutSessions.id, id)).returning();
        return updated ? this.convertWorkoutSession(updated) : void 0;
      }
      async deleteWorkoutSession(id) {
        try {
          const db2 = this.getDb();
          await db2.delete(schema_exports.workoutSessions).where(eq(schema_exports.workoutSessions.id, id));
          return true;
        } catch {
          return false;
        }
      }
      async createVideoUpload(upload2) {
        const db2 = this.getDb();
        const [created] = await db2.insert(schema_exports.videoUploads).values(upload2).returning();
        return this.convertVideoUpload(created);
      }
      async getVideoUpload(id) {
        const db2 = this.getDb();
        const [video] = await db2.select().from(schema_exports.videoUploads).where(eq(schema_exports.videoUploads.id, id));
        return video ? this.convertVideoUpload(video) : void 0;
      }
      async getVideosBySession(sessionId) {
        const db2 = this.getDb();
        const videos = await db2.select().from(schema_exports.videoUploads).where(eq(schema_exports.videoUploads.sessionId, sessionId)).orderBy(desc(schema_exports.videoUploads.uploadedAt));
        return videos.map((video) => this.convertVideoUpload(video));
      }
      async deleteVideoUpload(id) {
        try {
          const db2 = this.getDb();
          await db2.delete(schema_exports.videoUploads).where(eq(schema_exports.videoUploads.id, id));
          return true;
        } catch {
          return false;
        }
      }
      async updateVideoFilename(oldFilename, newFilename) {
        try {
          const db2 = this.getDb();
          await db2.update(schema_exports.videoUploads).set({ filename: newFilename }).where(eq(schema_exports.videoUploads.filename, oldFilename));
          return true;
        } catch {
          return false;
        }
      }
      async getCurrentSession() {
        if (this.activeSessionId) {
          return this.getWorkoutSession(this.activeSessionId);
        }
        const db2 = this.getDb();
        const [recent] = await db2.select().from(schema_exports.workoutSessions).orderBy(desc(schema_exports.workoutSessions.createdAt)).limit(1);
        if (recent) {
          this.activeSessionId = recent.id;
          return this.convertWorkoutSession(recent);
        }
        return void 0;
      }
      async setCurrentSession(sessionId) {
        this.activeSessionId = sessionId;
      }
      async clearCurrentSession() {
        this.activeSessionId = null;
      }
      async clearAllData() {
        const db2 = this.getDb();
        await db2.delete(schema_exports.videoUploads);
        await db2.delete(schema_exports.workoutSessions);
        this.activeSessionId = null;
      }
    };
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  constructor() {
    this.currentSessionId = 1;
    this.currentVideoId = 1;
    this.activeSessionId = null;
    this.sessions = /* @__PURE__ */ new Map();
    this.videos = /* @__PURE__ */ new Map();
  }
  async createWorkoutSession(session) {
    const workoutSession = {
      id: this.currentSessionId++,
      pdfFilename: session.pdfFilename,
      selectedDay: session.selectedDay,
      exercises: session.exercises || [],
      workoutData: session.workoutData,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.sessions.set(workoutSession.id, workoutSession);
    this.activeSessionId = workoutSession.id;
    return workoutSession;
  }
  async getWorkoutSession(id) {
    return this.sessions.get(id);
  }
  async updateWorkoutSession(id, updates) {
    const session = this.sessions.get(id);
    if (!session) return void 0;
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }
  async deleteWorkoutSession(id) {
    return this.sessions.delete(id);
  }
  async createVideoUpload(upload2) {
    const videoUpload = {
      id: this.currentVideoId++,
      sessionId: upload2.sessionId,
      exerciseId: upload2.exerciseId,
      weekId: upload2.weekId,
      filename: upload2.filename,
      originalName: upload2.originalName,
      mimeType: upload2.mimeType,
      size: upload2.size,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.videos.set(videoUpload.id, videoUpload);
    return videoUpload;
  }
  async getVideoUpload(id) {
    return this.videos.get(id);
  }
  async getVideosBySession(sessionId) {
    return Array.from(this.videos.values()).filter((video) => video.sessionId === sessionId);
  }
  async deleteVideoUpload(id) {
    return this.videos.delete(id);
  }
  async updateVideoFilename(oldFilename, newFilename) {
    for (const video of this.videos.values()) {
      if (video.filename === oldFilename) {
        video.filename = newFilename;
        return true;
      }
    }
    return false;
  }
  async getCurrentSession() {
    if (!this.activeSessionId) return void 0;
    return this.sessions.get(this.activeSessionId);
  }
  async setCurrentSession(sessionId) {
    this.activeSessionId = sessionId;
  }
  async clearCurrentSession() {
    this.activeSessionId = null;
  }
  async clearAllData() {
    this.sessions.clear();
    this.videos.clear();
    this.activeSessionId = null;
    this.currentSessionId = 1;
    this.currentVideoId = 1;
  }
};
async function createStorage() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    console.log("DATABASE_URL present:", !!dbUrl);
    console.log("DATABASE_URL prefix:", dbUrl ? dbUrl.substring(0, 15) : "none");
    if (dbUrl && (dbUrl.includes("postgresql://") || dbUrl.includes("postgres://") || dbUrl.startsWith("postgres"))) {
      console.log("DATABASE_URL format appears valid, testing connection...");
      try {
        const { DatabaseStorage: DatabaseStorage2 } = await Promise.resolve().then(() => (init_db_storage(), db_storage_exports));
        const testStorage = new DatabaseStorage2();
        await testStorage.getCurrentSession();
        console.log("Database connection successful, using PostgreSQL storage");
        return testStorage;
      } catch (dbError) {
        console.warn("Database connection failed:", dbError?.message || "Unknown error");
        console.log("Falling back to in-memory storage");
        return new MemStorage();
      }
    } else {
      console.log("DATABASE_URL not configured properly, using in-memory storage");
      console.log("Expected format: postgresql://... or postgres://...");
      return new MemStorage();
    }
  } catch (error) {
    console.warn("Storage initialization error:", error?.message || "Unknown error");
    return new MemStorage();
  }
}
var storage;
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
await initializeStorage();

// server/routes.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
var uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const timestamp2 = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, `${timestamp2}_${sanitizedName}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdf") {
      if (file.mimetype === "application/pdf") {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed"));
      }
    } else if (file.fieldname === "video") {
      if (file.mimetype.startsWith("video/")) {
        cb(null, true);
      } else {
        cb(new Error("Only video files are allowed"));
      }
    } else {
      cb(new Error("Unknown field"));
    }
  }
});
async function registerRoutes(app2) {
  app2.post("/api/upload-pdf", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }
      const { spawn: spawn2 } = await import("child_process");
      const pdfData = await new Promise((resolve, reject) => {
        const pythonProcess = spawn2("python3", ["precise_pdf_parser.py", req.file?.path || ""]);
        let output = "";
        let errorOutput = "";
        pythonProcess.stdout.on("data", (data) => {
          output += data.toString();
        });
        pythonProcess.stderr.on("data", (data) => {
          errorOutput += data.toString();
        });
        pythonProcess.on("close", (code) => {
          if (code === 0) {
            try {
              const result = JSON.parse(output);
              resolve(result);
            } catch (e) {
              reject(new Error("Errore nel parsing del JSON dal parser PDF"));
            }
          } else {
            console.error("Python PDF parser error:", errorOutput);
            reject(new Error("Errore durante l'analisi del PDF"));
          }
        });
      });
      if (!pdfData || !pdfData.pages || pdfData.pages.length === 0) {
        return res.status(400).json({
          error: "Nessuna tabella di esercizi trovata nel PDF. Assicurati che il PDF contenga tabelle di allenamento con esercizi, serie e ripetizioni."
        });
      }
      const session = await storage.createWorkoutSession({
        pdfFilename: req.file.originalname,
        exercises: [],
        workoutData: pdfData
      });
      res.json({
        sessionId: session.id,
        filename: req.file.originalname,
        pages: pdfData.pages
      });
    } catch (error) {
      console.error("PDF upload error:", error);
      res.status(500).json({ error: "Errore durante l'elaborazione del PDF" });
    }
  });
  app2.post("/api/select-day", async (req, res) => {
    try {
      const { sessionId, dayId, exercisesCount } = req.body;
      console.log("Select day request:", { sessionId, dayId, exercisesCount });
      let session = await storage.getWorkoutSession(sessionId);
      if (!session) {
        session = await storage.getCurrentSession();
        if (!session) {
          console.error(`No session found with ID ${sessionId} and no current session`);
          return res.status(404).json({ error: "Session not found" });
        }
        console.log(`Using current session ${session.id} instead of ${sessionId}`);
      }
      let exercisesForDay = [];
      if (session.workoutData?.pages) {
        const pageNumber = parseInt(dayId.split("-")[1]);
        const selectedPage = session.workoutData.pages.find((p) => p.pageNumber === pageNumber);
        if (selectedPage) {
          exercisesForDay = selectedPage.exercises || [];
          console.log(`Found ${exercisesForDay.length} exercises for day ${pageNumber}`);
        }
      }
      const updatedSession = await storage.updateWorkoutSession(session.id, {
        selectedDay: dayId,
        exercises: exercisesForDay
      });
      if (!updatedSession) {
        return res.status(500).json({ error: "Failed to update session" });
      }
      res.json({ success: true, session: updatedSession });
    } catch (error) {
      console.error("Day selection error:", error);
      res.status(500).json({ error: "Errore nella selezione del giorno" });
    }
  });
  app2.post("/api/manual-trim", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const { t_in, t_out } = req.body;
      const tIn = parseFloat(t_in);
      const tOut = parseFloat(t_out);
      if (isNaN(tIn) || isNaN(tOut) || tIn >= tOut || tIn < 0 || tOut < 0) {
        return res.status(400).json({ error: "Invalid trim parameters" });
      }
      const inputPath = path.resolve(req.file.path);
      if (!inputPath.startsWith(path.resolve(uploadDir))) {
        return res.status(400).json({ error: "Invalid file path" });
      }
      const uid = Date.now().toString();
      const outputFilename = `${uid}_trimmed.mp4`;
      const outputPath = path.resolve(path.join(uploadDir, outputFilename));
      const pythonProcess = spawn("python3", [
        path.join(__dirname, "trim_video.py"),
        inputPath,
        outputPath,
        tIn.toString(),
        tOut.toString()
      ]);
      let output = "";
      let error = "";
      pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
      });
      pythonProcess.stderr.on("data", (data) => {
        error += data.toString();
      });
      pythonProcess.on("close", (code) => {
        fs.unlink(inputPath, () => {
        });
        if (code === 0) {
          res.json({
            path: outputFilename,
            status: "OK",
            message: "Video trimmed successfully"
          });
        } else {
          console.error("Trim error:", error);
          res.status(500).json({
            error: "Video trimming failed",
            details: error
          });
        }
      });
    } catch (error) {
      console.error("Manual trim error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/migrate-to-db", async (req, res) => {
    try {
      if (!process.env.DATABASE_URL) {
        return res.status(500).json({
          error: "DATABASE_URL not configured",
          message: "Please set the DATABASE_URL environment variable with your Supabase connection string"
        });
      }
      const dbUrl = process.env.DATABASE_URL;
      const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      const diagnostics = {
        hasUrl: !!dbUrl,
        urlFormat: dbUrl.startsWith("postgresql://") ? "correct" : "incorrect",
        hostname: urlParts ? urlParts[3] : "unknown",
        port: urlParts ? urlParts[4] : "unknown",
        database: urlParts ? urlParts[5] : "unknown"
      };
      const { sql } = await import("drizzle-orm");
      const { db: database } = await Promise.resolve().then(() => (init_db(), db_exports));
      console.log("Testing database connection with diagnostics:", diagnostics);
      if (!database) {
        throw new Error("Database connection not available");
      }
      const connectionTest = await Promise.race([
        database.execute(sql`SELECT 1 as test, NOW() as current_time`),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout after 10 seconds")), 1e4))
      ]);
      console.log("Connection test successful:", connectionTest);
      await database.execute(sql`
        CREATE TABLE IF NOT EXISTS workout_sessions (
          id SERIAL PRIMARY KEY,
          pdf_filename TEXT NOT NULL,
          selected_day TEXT,
          exercises JSONB DEFAULT '[]'::jsonb NOT NULL,
          workout_data JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      await database.execute(sql`
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
      console.log("Database tables created successfully");
      console.log("Successfully migrated to PostgreSQL database storage");
      res.json({
        success: true,
        message: "Database connection successful and tables created. Restart the application to use PostgreSQL storage.",
        connectionTest,
        diagnostics,
        needsRestart: true
      });
    } catch (error) {
      console.error("Database migration error:", error);
      let errorDetails = error.message;
      let suggestions = [];
      if (error.message.includes("timeout")) {
        suggestions.push("Verifica che l'hostname del database sia corretto");
        suggestions.push("Controlla che il database Supabase sia attivo");
        suggestions.push("Prova a controllare la connessione di rete");
      } else if (error.message.includes("authentication")) {
        suggestions.push("Verifica che la password nel DATABASE_URL sia corretta");
        suggestions.push("Controlla che l'utente abbia i permessi necessari");
      } else if (error.message.includes("ENOTFOUND")) {
        suggestions.push("L'hostname del database non \xE8 raggiungibile");
        suggestions.push("Verifica che l'URL del database sia corretto");
      }
      res.status(500).json({
        error: "Database migration failed",
        details: errorDetails,
        suggestions,
        diagnostics: {
          hasUrl: !!process.env.DATABASE_URL,
          urlFormat: process.env.DATABASE_URL?.startsWith("postgresql://") ? "correct" : "incorrect"
        }
      });
    }
  });
  app2.get("/api/storage-status", async (req, res) => {
    res.json({
      type: storage.constructor.name,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      message: storage.constructor.name === "DatabaseStorage" ? "Using PostgreSQL database storage" : "Using temporary in-memory storage"
    });
  });
  app2.post("/api/upload-video", upload.single("video"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No video file uploaded" });
      }
      const { sessionId, exerciseId, weekId } = req.body;
      if (!sessionId || !exerciseId || !weekId) {
        return res.status(400).json({ error: "Missing required fields: sessionId, exerciseId, weekId" });
      }
      const parsedSessionId = parseInt(sessionId);
      if (isNaN(parsedSessionId)) {
        return res.status(400).json({ error: "Invalid sessionId" });
      }
      const videoUpload = await storage.createVideoUpload({
        sessionId: parsedSessionId,
        exerciseId,
        weekId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      });
      res.json({
        videoId: videoUpload.id,
        filename: videoUpload.filename,
        originalName: videoUpload.originalName
      });
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({ error: "Errore durante il caricamento del video" });
    }
  });
  app2.post("/api/update-exercise", async (req, res) => {
    try {
      const { sessionId, exerciseId, weekId, rpe, notes } = req.body;
      console.log("Update exercise request:", { sessionId, exerciseId, weekId, rpe, notes });
      const session = await storage.getWorkoutSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const exercises = [...session.exercises];
      const exerciseIndex = exercises.findIndex((e) => e.id === exerciseId);
      console.log("Found exercise index:", exerciseIndex, "for exercise ID:", exerciseId);
      if (exerciseIndex >= 0) {
        if (!exercises[exerciseIndex].weeks) {
          exercises[exerciseIndex].weeks = {};
        }
        if (!exercises[exerciseIndex].weeks[weekId]) {
          exercises[exerciseIndex].weeks[weekId] = {};
        }
        if (rpe !== void 0) {
          exercises[exerciseIndex].weeks[weekId].rpe = rpe;
          console.log("Updated RPE:", rpe, "for exercise:", exerciseId, "week:", weekId);
        }
        if (notes !== void 0) {
          exercises[exerciseIndex].notes = notes;
          console.log("Updated notes for exercise:", exerciseId);
        }
      } else {
        console.log("Exercise not found. Available exercises:", exercises.map((ex) => ({ id: ex.id, name: ex.name })));
        return res.status(404).json({ error: "Exercise not found" });
      }
      const updatedSession = await storage.updateWorkoutSession(sessionId, { exercises });
      console.log("Session updated successfully");
      res.json({ success: true, session: updatedSession });
    } catch (error) {
      console.error("Exercise update error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'esercizio" });
    }
  });
  app2.get("/api/videos", async (req, res) => {
    try {
      const session = await storage.getCurrentSession();
      if (!session) {
        return res.json([]);
      }
      const videos = await storage.getVideosBySession(session.id);
      res.json(videos);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ error: "Errore nel recupero dei video" });
    }
  });
  app2.delete("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideoUpload(videoId);
      const deleted = await storage.deleteVideoUpload(videoId);
      if (deleted && video) {
        const filePath = path.join(uploadDir, video.filename);
        fs.unlink(filePath, (err) => {
          if (err) {
            console.warn("Could not delete video file:", err.message);
          }
        });
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Video not found" });
      }
    } catch (error) {
      console.error("Delete video error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione del video" });
    }
  });
  app2.get("/api/current-session", async (req, res) => {
    try {
      const session = await storage.getCurrentSession();
      if (!session) {
        return res.json({ session: null });
      }
      const videos = await storage.getVideosBySession(session.id);
      res.json({ session, videos });
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ error: "Errore nel recupero della sessione" });
    }
  });
  app2.post("/api/restart", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ success: true });
    } catch (error) {
      console.error("Restart error:", error);
      res.status(500).json({ error: "Errore nel riavvio dell'applicazione" });
    }
  });
  app2.post("/api/send-to-telegram", async (req, res) => {
    try {
      const session = await storage.getCurrentSession();
      if (!session) {
        return res.status(404).json({ error: "No active session" });
      }
      const videos = await storage.getVideosBySession(session.id);
      const { spawn: spawn2 } = await import("child_process");
      const telegramData = {
        session,
        videos
      };
      const pythonProcess = spawn2("python3", ["telegram_bot.py"], {
        stdio: ["pipe", "pipe", "pipe"]
      });
      let output = "";
      let errorOutput = "";
      pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
      });
      pythonProcess.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      pythonProcess.stdin.write(JSON.stringify(telegramData));
      pythonProcess.stdin.end();
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          console.log("Telegram send successful:", output);
          res.json({ success: true });
        } else {
          console.error("Telegram send failed:", errorOutput);
          res.status(500).json({ error: "Errore nell'invio su Telegram: " + errorOutput });
        }
      });
    } catch (error) {
      console.error("Telegram send error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Errore nell'invio su Telegram: " + errorMessage });
    }
  });
  app2.use("/uploads", express.static(uploadDir));
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path2.resolve("client", "src"),
      "@shared": path2.resolve("shared"),
      "@assets": path2.resolve("attached_assets")
    }
  },
  root: path2.resolve("client"),
  build: {
    outDir: path2.resolve("dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = process.env.PORT || 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
