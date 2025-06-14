import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { spawn } from "child_process";
import { insertWorkoutSessionSchema, insertVideoUploadSchema } from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${timestamp}_${sanitizedName}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    } else if (file.fieldname === 'video') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'));
      }
    } else {
      cb(new Error('Unknown field'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Upload PDF and parse
  app.post("/api/upload-pdf", upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Parse PDF using Python script
      const { spawn } = await import('child_process');
      const pdfData: any = await new Promise((resolve, reject) => {
        // Try the main parser first, fallback to simple parser if it fails
        const pythonProcess = spawn('python3', ['precise_pdf_parser.py', req.file?.path || '']);
        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data: any) => {
          output += data.toString();
        });

        pythonProcess.stderr.on('data', (data: any) => {
          errorOutput += data.toString();
        });

        pythonProcess.on('close', (code: any) => {
          if (code === 0) {
            try {
              const result = JSON.parse(output);
              resolve(result);
            } catch (e) {
              reject(new Error('Errore nel parsing del JSON dal parser PDF'));
            }
          } else {
            console.error('Python PDF parser error:', errorOutput);
            reject(new Error('Errore durante l\'analisi del PDF'));
          }
        });
      });
      
      if (!pdfData || !pdfData.pages || pdfData.pages.length === 0) {
        return res.status(400).json({ 
          error: "Nessuna tabella di esercizi trovata nel PDF. Assicurati che il PDF contenga tabelle di allenamento con esercizi, serie e ripetizioni." 
        });
      }

      // Create workout session with extracted PDF data
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

  // Select day and get exercises
  app.post("/api/select-day", async (req, res) => {
    try {
      const { sessionId, dayId, exercisesCount } = req.body;
      
      console.log('Select day request:', { sessionId, dayId, exercisesCount });
      
      // First try to get the session
      let session = await storage.getWorkoutSession(sessionId);
      
      if (!session) {
        // If session not found, try to get the current session
        session = await storage.getCurrentSession();
        if (!session) {
          console.error(`No session found with ID ${sessionId} and no current session`);
          return res.status(404).json({ error: "Session not found" });
        }
        console.log(`Using current session ${session.id} instead of ${sessionId}`);
      }
      
      // Extract exercises from the selected page in workoutData
      let exercisesForDay = [];
      if ((session as any).workoutData?.pages) {
        const pageNumber = parseInt(dayId.split('-')[1]);
        const selectedPage = (session as any).workoutData.pages.find((p: any) => p.pageNumber === pageNumber);
        if (selectedPage) {
          exercisesForDay = selectedPage.exercises || [];
          console.log(`Found ${exercisesForDay.length} exercises for day ${pageNumber}`);
        }
      }
      
      // Update the session with selected day and exercises
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

  // Manual video trim route
  app.post('/api/manual-trim', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { t_in, t_out } = req.body;
      const tIn = parseFloat(t_in);
      const tOut = parseFloat(t_out);

      if (isNaN(tIn) || isNaN(tOut) || tIn >= tOut || tIn < 0 || tOut < 0) {
        return res.status(400).json({ error: 'Invalid trim parameters' });
      }

      // Validate file path to prevent directory traversal
      const inputPath = path.resolve(req.file.path);
      if (!inputPath.startsWith(path.resolve(uploadDir))) {
        return res.status(400).json({ error: 'Invalid file path' });
      }

      const uid = Date.now().toString();
      const outputFilename = `${uid}_trimmed.mp4`;
      const outputPath = path.resolve(path.join(uploadDir, outputFilename));

      // Use Python script for video trimming with ffmpeg
      const pythonProcess = spawn('python3', [
        path.join(__dirname, 'trim_video.py'),
        inputPath,
        outputPath,
        tIn.toString(),
        tOut.toString()
      ]);

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        // Clean up input file
        fs.unlink(inputPath, () => {});

        if (code === 0) {
          res.json({ 
            path: outputFilename,
            status: 'OK',
            message: 'Video trimmed successfully'
          });
        } else {
          console.error('Trim error:', error);
          res.status(500).json({ 
            error: 'Video trimming failed',
            details: error
          });
        }
      });

    } catch (error) {
      console.error('Manual trim error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Test database connection and migrate to PostgreSQL
  app.post("/api/migrate-to-db", async (req, res) => {
    try {
      // Test if DATABASE_URL is set
      if (!process.env.DATABASE_URL) {
        return res.status(500).json({ 
          error: "DATABASE_URL not configured",
          message: "Please set the DATABASE_URL environment variable with your Supabase connection string" 
        });
      }

      // Parse DATABASE_URL to show diagnostic info (without password)
      const dbUrl = process.env.DATABASE_URL;
      const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      const diagnostics = {
        hasUrl: !!dbUrl,
        urlFormat: dbUrl.startsWith('postgresql://') ? 'correct' : 'incorrect',
        hostname: urlParts ? urlParts[3] : 'unknown',
        port: urlParts ? urlParts[4] : 'unknown',
        database: urlParts ? urlParts[5] : 'unknown'
      };

      const { sql } = await import("drizzle-orm");
      const { db: database } = await import("./db");

      console.log("Testing database connection with diagnostics:", diagnostics);

      if (!database) {
        throw new Error('Database connection not available');
      }

      // Test basic connection with timeout
      const connectionTest = await Promise.race([
        database!.execute(sql`SELECT 1 as test, NOW() as current_time`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000))
      ]);

      console.log("Connection test successful:", connectionTest);

      // Create tables if connection successful
      await database!.execute(sql`
        CREATE TABLE IF NOT EXISTS workout_sessions (
          id SERIAL PRIMARY KEY,
          pdf_filename TEXT NOT NULL,
          selected_day TEXT,
          exercises JSONB DEFAULT '[]'::jsonb NOT NULL,
          workout_data JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      await database!.execute(sql`
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

      // Migration successful - the app will use DatabaseStorage on restart
      console.log("Database tables created successfully");

      console.log("Successfully migrated to PostgreSQL database storage");

      res.json({ 
        success: true, 
        message: "Database connection successful and tables created. Restart the application to use PostgreSQL storage.",
        connectionTest,
        diagnostics,
        needsRestart: true
      });
    } catch (error: any) {
      console.error("Database migration error:", error);
      
      // Provide more detailed error information
      let errorDetails = error.message;
      let suggestions = [];

      if (error.message.includes('timeout')) {
        suggestions.push("Verifica che l'hostname del database sia corretto");
        suggestions.push("Controlla che il database Supabase sia attivo");
        suggestions.push("Prova a controllare la connessione di rete");
      } else if (error.message.includes('authentication')) {
        suggestions.push("Verifica che la password nel DATABASE_URL sia corretta");
        suggestions.push("Controlla che l'utente abbia i permessi necessari");
      } else if (error.message.includes('ENOTFOUND')) {
        suggestions.push("L'hostname del database non è raggiungibile");
        suggestions.push("Verifica che l'URL del database sia corretto");
      }

      res.status(500).json({ 
        error: "Database migration failed", 
        details: errorDetails,
        suggestions,
        diagnostics: {
          hasUrl: !!process.env.DATABASE_URL,
          urlFormat: process.env.DATABASE_URL?.startsWith('postgresql://') ? 'correct' : 'incorrect'
        }
      });
    }
  });

  // Get current storage status
  app.get("/api/storage-status", async (req, res) => {
    res.json({
      type: storage.constructor.name,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      message: storage.constructor.name === 'DatabaseStorage' 
        ? 'Using PostgreSQL database storage' 
        : 'Using temporary in-memory storage'
    });
  });

  // Upload video for exercise
  app.post("/api/upload-video", upload.single('video'), async (req, res) => {
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

  // Update exercise data (RPE, notes)
  app.post("/api/update-exercise", async (req, res) => {
    try {
      const { sessionId, exerciseId, weekId, rpe, notes } = req.body;
      
      console.log('Update exercise request:', { sessionId, exerciseId, weekId, rpe, notes });
      
      const session = await storage.getWorkoutSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Update exercise data
      const exercises = [...session.exercises];
      const exerciseIndex = exercises.findIndex(e => e.id === exerciseId);
      
      console.log('Found exercise index:', exerciseIndex, 'for exercise ID:', exerciseId);
      
      if (exerciseIndex >= 0) {
        // Assicurati che l'oggetto weeks esista
        if (!exercises[exerciseIndex].weeks) {
          exercises[exerciseIndex].weeks = {};
        }
        
        // Assicurati che l'oggetto della settimana esista
        if (!exercises[exerciseIndex].weeks[weekId]) {
          exercises[exerciseIndex].weeks[weekId] = {};
        }
        
        if (rpe !== undefined) {
          exercises[exerciseIndex].weeks[weekId].rpe = rpe;
          console.log('Updated RPE:', rpe, 'for exercise:', exerciseId, 'week:', weekId);
        }
        
        if (notes !== undefined) {
          exercises[exerciseIndex].notes = notes;
          console.log('Updated notes for exercise:', exerciseId);
        }
      } else {
        console.log('Exercise not found. Available exercises:', exercises.map(ex => ({ id: ex.id, name: ex.name })));
        return res.status(404).json({ error: 'Exercise not found' });
      }

      const updatedSession = await storage.updateWorkoutSession(sessionId, { exercises });
      console.log('Session updated successfully');
      res.json({ success: true, session: updatedSession });
    } catch (error) {
      console.error("Exercise update error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'esercizio" });
    }
  });

  // Get videos for current session
  app.get("/api/videos", async (req, res) => {
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

  // Delete video
  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      // Get video info before deletion to remove file
      const video = await storage.getVideoUpload(videoId);
      
      // Delete from storage
      const deleted = await storage.deleteVideoUpload(videoId);
      
      if (deleted && video) {
        // Remove physical file
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

  // Get current session
  app.get("/api/current-session", async (req, res) => {
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

  // Reset/restart application
  app.post("/api/restart", async (req, res) => {
    try {
      await storage.clearAllData();
      res.json({ success: true });
    } catch (error) {
      console.error("Restart error:", error);
      res.status(500).json({ error: "Errore nel riavvio dell'applicazione" });
    }
  });

  // Send to Telegram
  app.post("/api/send-to-telegram", async (req, res) => {
    try {
      const session = await storage.getCurrentSession();
      if (!session) {
        return res.status(404).json({ error: "No active session" });
      }

      const videos = await storage.getVideosBySession(session.id);
      
      // Import and call the Telegram bot
      const { spawn } = await import('child_process');
      
      // Prepare data for Python script
      const telegramData = {
        session: session,
        videos: videos
      };
      
      // Call Python Telegram bot script
      const pythonProcess = spawn('python3', ['telegram_bot.py'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      pythonProcess.stdin.write(JSON.stringify(telegramData));
      pythonProcess.stdin.end();
      
      pythonProcess.on('close', (code: number | null) => {
        if (code === 0) {
          console.log('Telegram send successful:', output);
          res.json({ success: true });
        } else {
          console.error('Telegram send failed:', errorOutput);
          res.status(500).json({ error: "Errore nell'invio su Telegram: " + errorOutput });
        }
      });

    } catch (error: unknown) {
      console.error("Telegram send error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: "Errore nell'invio su Telegram: " + errorMessage });
    }
  });

  // Serve uploaded files
  app.use("/uploads", express.static(uploadDir));

  const httpServer = createServer(app);
  return httpServer;
}
