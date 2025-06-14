import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// Simple in-memory storage for Vercel deployment
class SimpleStorage {
  constructor() {
    this.sessions = new Map();
    this.videos = new Map();
    this.currentSessionId = 1;
    this.currentVideoId = 1;
    this.activeSessionId = null;
  }

  async createWorkoutSession(session) {
    const newSession = {
      id: this.currentSessionId++,
      ...session,
      exercises: session.exercises || [],
      createdAt: new Date().toISOString()
    };
    this.sessions.set(newSession.id, newSession);
    this.activeSessionId = newSession.id;
    return newSession;
  }

  async getWorkoutSession(id) {
    return this.sessions.get(id);
  }

  async updateWorkoutSession(id, updates) {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    const updated = { ...session, ...updates };
    this.sessions.set(id, updated);
    return updated;
  }

  async deleteWorkoutSession(id) {
    return this.sessions.delete(id);
  }

  async createVideoUpload(upload) {
    const video = {
      id: this.currentVideoId++,
      ...upload,
      uploadedAt: new Date().toISOString()
    };
    this.videos.set(video.id, video);
    return video;
  }

  async getVideoUpload(id) {
    return this.videos.get(id);
  }

  async getVideosBySession(sessionId) {
    return Array.from(this.videos.values()).filter(v => v.sessionId === sessionId);
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
    if (this.activeSessionId) {
      return this.getWorkoutSession(this.activeSessionId);
    }
    const sessions = Array.from(this.sessions.values());
    if (sessions.length > 0) {
      const recent = sessions[sessions.length - 1];
      this.activeSessionId = recent.id;
      return recent;
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
    this.sessions.clear();
    this.videos.clear();
    this.activeSessionId = null;
  }
}

const storage = new SimpleStorage();
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = '/tmp/uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${timestamp}_${originalName}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    const pythonProcess = spawn('python3', ['precise_pdf_parser.py', pdfPath], {
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      try {
        if (code !== 0) {
          console.error('Python process error:', stderr);
          return res.status(500).json({ error: 'Failed to parse PDF' });
        }

        const result = JSON.parse(stdout);
        const session = await storage.createWorkoutSession({
          pdfFilename: req.file.originalname,
          exercises: [],
          workoutData: result
        });

        await storage.setCurrentSession(session.id);
        res.json({ sessionId: session.id, filename: req.file.originalname, workoutData: result });
      } catch (error) {
        console.error('Error processing PDF result:', error);
        res.status(500).json({ error: 'Failed to process PDF data' });
      }
    });
  } catch (error) {
    console.error('Error in upload-pdf:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/current-session', async (req, res) => {
  try {
    const session = await storage.getCurrentSession();
    if (!session) {
      return res.status(404).json({ error: 'No active session' });
    }
    res.json({ session });
  } catch (error) {
    console.error('Error getting current session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/select-day', async (req, res) => {
  try {
    const { sessionId, dayId, exercises } = req.body;
    
    const session = await storage.updateWorkoutSession(sessionId, {
      selectedDay: dayId,
      exercises: exercises || []
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Error selecting day:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/upload-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { sessionId, exerciseId, weekId } = req.body;
    
    const videoUpload = await storage.createVideoUpload({
      sessionId: parseInt(sessionId),
      exerciseId,
      weekId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    res.json({
      videoId: videoUpload.id,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/videos', async (req, res) => {
  try {
    const session = await storage.getCurrentSession();
    if (!session) {
      return res.json([]);
    }

    const videos = await storage.getVideosBySession(session.id);
    res.json(videos);
  } catch (error) {
    console.error('Error getting videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/update-exercise', async (req, res) => {
  try {
    const { sessionId, exerciseId, weekId, rpe, notes } = req.body;
    
    const session = await storage.getWorkoutSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const exercises = [...(session.exercises || [])];
    const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseId);
    
    if (exerciseIndex !== -1) {
      if (!exercises[exerciseIndex].weeks) {
        exercises[exerciseIndex].weeks = {};
      }
      
      if (!exercises[exerciseIndex].weeks[weekId]) {
        exercises[exerciseIndex].weeks[weekId] = {};
      }
      
      if (rpe !== undefined) {
        exercises[exerciseIndex].weeks[weekId].rpe = rpe;
      }
      if (notes !== undefined) {
        exercises[exerciseIndex].notes = notes;
      }
    } else {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const updatedSession = await storage.updateWorkoutSession(sessionId, { exercises });
    res.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const deleted = await storage.deleteVideoUpload(videoId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoachSheet - Workout Tracker</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #4c63d2 0%, #6c5ce7 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; font-weight: 700; }
        .header p { opacity: 0.9; font-size: 1.1rem; }
        .content { padding: 40px; }
        .section { margin-bottom: 30px; padding: 25px; border: 2px dashed #e1e5e9; border-radius: 15px; transition: all 0.3s ease; }
        .section:hover { border-color: #6c5ce7; background: #f8f9ff; }
        .section h3 { color: #2d3748; margin-bottom: 15px; font-size: 1.3rem; }
        .upload-area { border: 3px dashed #cbd5e0; border-radius: 10px; padding: 30px; text-align: center; cursor: pointer; transition: all 0.3s ease; }
        .upload-area:hover { border-color: #6c5ce7; background: #f7faff; }
        .upload-area.dragover { border-color: #4c63d2; background: #eef2ff; }
        input[type="file"] { display: none; }
        .btn { background: linear-gradient(135deg, #6c5ce7 0%, #4c63d2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: all 0.3s ease; margin: 5px; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(108, 92, 231, 0.3); }
        .status { margin-top: 20px; padding: 15px; border-radius: 8px; font-weight: 500; }
        .status.success { background: #f0fff4; color: #38a169; border: 1px solid #9ae6b4; }
        .status.error { background: #fed7d7; color: #e53e3e; border: 1px solid #feb2b2; }
        .status.loading { background: #ebf8ff; color: #3182ce; border: 1px solid #90cdf4; }
        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 30px; }
        .feature { text-align: center; padding: 20px; background: #f7fafc; border-radius: 12px; }
        .feature-icon { font-size: 2rem; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CoachSheet</h1>
            <p>Sistema di tracking workout professionale</p>
        </div>
        <div class="content">
            <div class="section">
                <h3>📄 Upload PDF Workout</h3>
                <div class="upload-area" onclick="document.getElementById('pdfInput').click()">
                    <p>Clicca qui o trascina il tuo PDF workout</p>
                    <p style="color: #718096; margin-top: 10px;">Formati supportati: PDF</p>
                </div>
                <input type="file" id="pdfInput" accept=".pdf" onchange="uploadPDF(this)">
                <div id="pdfStatus"></div>
            </div>
            <div class="section">
                <h3>🎥 Upload Video Esercizio</h3>
                <div class="upload-area" onclick="document.getElementById('videoInput').click()">
                    <p>Carica video dell'esercizio</p>
                    <p style="color: #718096; margin-top: 10px;">Formati supportati: MP4, MOV, AVI</p>
                </div>
                <input type="file" id="videoInput" accept="video/*" onchange="uploadVideo(this)">
                <div id="videoStatus"></div>
            </div>
            <div class="section">
                <h3>📊 Sessione Corrente</h3>
                <button class="btn" onclick="getCurrentSession()">Carica Sessione</button>
                <button class="btn" onclick="clearSession()">Nuova Sessione</button>
                <div id="sessionStatus"></div>
            </div>
            <div class="features">
                <div class="feature"><div class="feature-icon">📈</div><h4>Tracking RPE</h4><p>Monitora l'intensità dei tuoi allenamenti</p></div>
                <div class="feature"><div class="feature-icon">🎯</div><h4>Analisi Workout</h4><p>Parser intelligente per PDF workout</p></div>
                <div class="feature"><div class="feature-icon">📱</div><h4>Mobile Ready</h4><p>Ottimizzato per dispositivi mobili</p></div>
            </div>
        </div>
    </div>
    <script>
        document.querySelectorAll('.upload-area').forEach(area => {
            area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('dragover'); });
            area.addEventListener('dragleave', () => { area.classList.remove('dragover'); });
            area.addEventListener('drop', (e) => {
                e.preventDefault(); area.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const fileType = files[0].type;
                    if (fileType.includes('pdf')) uploadPDF({ files: files });
                    else if (fileType.includes('video')) uploadVideo({ files: files });
                }
            });
        });
        async function uploadPDF(input) {
            const file = input.files[0]; if (!file) return;
            const statusDiv = document.getElementById('pdfStatus');
            statusDiv.innerHTML = '<div class="status loading">Uploading PDF...</div>';
            const formData = new FormData(); formData.append('pdf', file);
            try {
                const response = await fetch('/api/fallback?action=upload-pdf', { method: 'POST', body: formData });
                const result = await response.json();
                if (response.ok) statusDiv.innerHTML = \`<div class="status success">PDF caricato con successo! Sessione ID: \${result.sessionId}</div>\`;
                else statusDiv.innerHTML = \`<div class="status error">Errore: \${result.error}</div>\`;
            } catch (error) { statusDiv.innerHTML = \`<div class="status error">Errore di connessione: \${error.message}</div>\`; }
        }
        async function uploadVideo(input) {
            const file = input.files[0]; if (!file) return;
            const statusDiv = document.getElementById('videoStatus');
            statusDiv.innerHTML = '<div class="status loading">Uploading video...</div>';
            const formData = new FormData(); formData.append('video', file); formData.append('sessionId', '1'); formData.append('exerciseId', 'ex1'); formData.append('weekId', 'week1');
            try {
                const response = await fetch('/api/fallback?action=upload-video', { method: 'POST', body: formData });
                const result = await response.json();
                if (response.ok) statusDiv.innerHTML = \`<div class="status success">Video caricato con successo! ID: \${result.videoId}</div>\`;
                else statusDiv.innerHTML = \`<div class="status error">Errore: \${result.error}</div>\`;
            } catch (error) { statusDiv.innerHTML = \`<div class="status error">Errore di connessione: \${error.message}</div>\`; }
        }
        async function getCurrentSession() {
            const statusDiv = document.getElementById('sessionStatus');
            statusDiv.innerHTML = '<div class="status loading">Caricando sessione...</div>';
            try {
                const response = await fetch('/api/fallback?action=current-session');
                const result = await response.json();
                if (response.ok) statusDiv.innerHTML = \`<div class="status success">Sessione attiva trovata! PDF: \${result.session.pdfFilename}</div>\`;
                else statusDiv.innerHTML = \`<div class="status error">Nessuna sessione attiva</div>\`;
            } catch (error) { statusDiv.innerHTML = \`<div class="status error">Errore di connessione: \${error.message}</div>\`; }
        }
        async function clearSession() {
            const statusDiv = document.getElementById('sessionStatus');
            statusDiv.innerHTML = '<div class="status success">Pronto per nuova sessione</div>';
        }
        window.addEventListener('load', () => { getCurrentSession(); });
    </script>
</body>
</html>`;

export default async function handler(req, res) {
  // Serve HTML for root requests
  if (req.method === 'GET' && !req.url.includes('?action=')) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(HTML_TEMPLATE);
  }
  
  // Handle API requests
  return app(req, res);
}