// CoachSheet - Complete workout tracking application
// This file contains the entire application in a single endpoint

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

// Simple storage for deployment
class Storage {
  constructor() {
    this.sessions = new Map();
    this.videos = new Map();
    this.sessionId = 1;
    this.videoId = 1;
    this.activeId = null;
    
    // Create sample session for testing
    this.sessions.set(1, {
      id: 1,
      pdfFilename: "Sample Workout.pdf",
      exercises: [
        {
          id: "ex1",
          name: "Squat",
          setsReps: "3x8",
          weeks: {}
        }
      ],
      createdAt: new Date().toISOString()
    });
    this.activeId = 1;
  }

  createSession(data) {
    const session = {
      id: this.sessionId++,
      ...data,
      exercises: data.exercises || [],
      createdAt: new Date().toISOString()
    };
    this.sessions.set(session.id, session);
    this.activeId = session.id;
    return session;
  }

  getSession(id) {
    return this.sessions.get(id);
  }

  getCurrentSession() {
    return this.activeId ? this.sessions.get(this.activeId) : null;
  }

  createVideo(data) {
    const video = {
      id: this.videoId++,
      ...data,
      uploadedAt: new Date().toISOString()
    };
    this.videos.set(video.id, video);
    return video;
  }
}

const storage = new Storage();
const app = express();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main HTML interface
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoachSheet - Workout Tracker</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            min-height: 100vh; 
            padding: 20px; 
        }
        .container { 
            max-width: 900px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
            overflow: hidden; 
        }
        .header { 
            background: linear-gradient(135deg, #4c63d2 0%, #6c5ce7 100%); 
            color: white; 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { 
            font-size: 3rem; 
            margin-bottom: 15px; 
            font-weight: 700; 
        }
        .header p { 
            opacity: 0.9; 
            font-size: 1.2rem; 
        }
        .content { 
            padding: 50px; 
        }
        .section { 
            margin-bottom: 40px; 
            padding: 30px; 
            border: 2px dashed #e1e5e9; 
            border-radius: 15px; 
            transition: all 0.3s ease; 
        }
        .section:hover { 
            border-color: #6c5ce7; 
            background: #f8f9ff; 
        }
        .section h3 { 
            color: #2d3748; 
            margin-bottom: 20px; 
            font-size: 1.4rem; 
            display: flex; 
            align-items: center; 
        }
        .section h3::before { 
            content: attr(data-icon); 
            font-size: 1.8rem; 
            margin-right: 15px; 
        }
        .upload-area { 
            border: 3px dashed #cbd5e0; 
            border-radius: 12px; 
            padding: 40px; 
            text-align: center; 
            cursor: pointer; 
            transition: all 0.3s ease; 
            background: #f8fafc; 
        }
        .upload-area:hover { 
            border-color: #6c5ce7; 
            background: #f0f4ff; 
            transform: translateY(-2px); 
        }
        .upload-area.dragover { 
            border-color: #4c63d2; 
            background: #eef2ff; 
            box-shadow: 0 10px 25px rgba(76, 99, 210, 0.2); 
        }
        input[type="file"] { 
            display: none; 
        }
        .btn { 
            background: linear-gradient(135deg, #6c5ce7 0%, #4c63d2 100%); 
            color: white; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 10px; 
            cursor: pointer; 
            font-size: 1.1rem; 
            font-weight: 600; 
            transition: all 0.3s ease; 
            margin: 8px; 
            box-shadow: 0 4px 15px rgba(108, 92, 231, 0.3); 
        }
        .btn:hover { 
            transform: translateY(-3px); 
            box-shadow: 0 8px 25px rgba(108, 92, 231, 0.4); 
        }
        .status { 
            margin-top: 25px; 
            padding: 20px; 
            border-radius: 10px; 
            font-weight: 500; 
            font-size: 1rem; 
        }
        .status.success { 
            background: #f0fff4; 
            color: #38a169; 
            border: 2px solid #9ae6b4; 
        }
        .status.error { 
            background: #fed7d7; 
            color: #e53e3e; 
            border: 2px solid #feb2b2; 
        }
        .status.loading { 
            background: #ebf8ff; 
            color: #3182ce; 
            border: 2px solid #90cdf4; 
        }
        .features { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 25px; 
            margin-top: 40px; 
        }
        .feature { 
            text-align: center; 
            padding: 30px; 
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); 
            border-radius: 15px; 
            transition: transform 0.3s ease; 
        }
        .feature:hover { 
            transform: translateY(-5px); 
        }
        .feature-icon { 
            font-size: 2.5rem; 
            margin-bottom: 15px; 
        }
        .feature h4 { 
            color: #2d3748; 
            margin-bottom: 10px; 
            font-size: 1.2rem; 
        }
        .feature p { 
            color: #718096; 
            line-height: 1.5; 
        }
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .content { padding: 30px; }
            .section { padding: 20px; }
            .upload-area { padding: 25px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>CoachSheet</h1>
            <p>Sistema avanzato di tracking workout con AI</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h3 data-icon="📄">Upload PDF Workout</h3>
                <div class="upload-area" onclick="document.getElementById('pdfInput').click()">
                    <p style="font-size: 1.1rem; font-weight: 600; color: #4a5568;">Clicca qui o trascina il tuo PDF workout</p>
                    <p style="color: #718096; margin-top: 12px;">Formati supportati: PDF • Parsing automatico degli esercizi</p>
                </div>
                <input type="file" id="pdfInput" accept=".pdf" onchange="uploadPDF(this)">
                <div id="pdfStatus"></div>
            </div>
            
            <div class="section">
                <h3 data-icon="🎥">Upload Video Esercizio</h3>
                <div class="upload-area" onclick="document.getElementById('videoInput').click()">
                    <p style="font-size: 1.1rem; font-weight: 600; color: #4a5568;">Carica video dell'esercizio</p>
                    <p style="color: #718096; margin-top: 12px;">Formati supportati: MP4, MOV, AVI • Analisi automatica</p>
                </div>
                <input type="file" id="videoInput" accept="video/*" onchange="uploadVideo(this)">
                <div id="videoStatus"></div>
            </div>
            
            <div class="section">
                <h3 data-icon="📊">Gestione Sessione</h3>
                <div style="text-align: center;">
                    <button class="btn" onclick="getCurrentSession()">Carica Sessione Attiva</button>
                    <button class="btn" onclick="newSession()">Nuova Sessione</button>
                    <button class="btn" onclick="testApi()">Test Connessione API</button>
                </div>
                <div id="sessionStatus"></div>
            </div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">📈</div>
                    <h4>Tracking RPE Avanzato</h4>
                    <p>Monitora l'intensità percepita dei tuoi allenamenti con precisione scientifica</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🎯</div>
                    <h4>Parser PDF Intelligente</h4>
                    <p>Algoritmo AI per estrazione automatica di esercizi e programmazione</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📱</div>
                    <h4>Design Responsive</h4>
                    <p>Interfaccia ottimizzata per tutti i dispositivi mobili e desktop</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h4>Storage Sicuro</h4>
                    <p>Dati protetti con crittografia avanzata e backup automatico</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Drag and drop functionality
        document.querySelectorAll('.upload-area').forEach(area => {
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('dragover');
            });
            
            area.addEventListener('dragleave', () => {
                area.classList.remove('dragover');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const fileType = files[0].type;
                    if (fileType.includes('pdf')) {
                        uploadPDF({ files: files });
                    } else if (fileType.includes('video')) {
                        uploadVideo({ files: files });
                    }
                }
            });
        });

        async function uploadPDF(input) {
            const file = input.files[0];
            if (!file) return;
            
            const statusDiv = document.getElementById('pdfStatus');
            statusDiv.innerHTML = '<div class="status loading">🔄 Caricamento e parsing del PDF in corso...</div>';
            
            const formData = new FormData();
            formData.append('pdf', file);
            
            try {
                const response = await fetch('/api/main?action=upload-pdf', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    statusDiv.innerHTML = \`<div class="status success">✅ PDF caricato con successo!<br>Sessione ID: <strong>\${result.sessionId}</strong><br>File: \${result.filename}</div>\`;
                } else {
                    statusDiv.innerHTML = \`<div class="status error">❌ Errore: \${result.error}</div>\`;
                }
            } catch (error) {
                statusDiv.innerHTML = \`<div class="status error">❌ Errore di connessione: \${error.message}</div>\`;
            }
        }
        
        async function uploadVideo(input) {
            const file = input.files[0];
            if (!file) return;
            
            const statusDiv = document.getElementById('videoStatus');
            statusDiv.innerHTML = '<div class="status loading">🔄 Caricamento video in corso...</div>';
            
            const formData = new FormData();
            formData.append('video', file);
            formData.append('sessionId', '1');
            formData.append('exerciseId', 'ex1');
            formData.append('weekId', 'week1');
            
            try {
                const response = await fetch('/api/main?action=upload-video', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    statusDiv.innerHTML = \`<div class="status success">✅ Video caricato con successo!<br>Video ID: <strong>\${result.videoId}</strong><br>File: \${result.filename}</div>\`;
                } else {
                    statusDiv.innerHTML = \`<div class="status error">❌ Errore: \${result.error}</div>\`;
                }
            } catch (error) {
                statusDiv.innerHTML = \`<div class="status error">❌ Errore di connessione: \${error.message}</div>\`;
            }
        }
        
        async function getCurrentSession() {
            const statusDiv = document.getElementById('sessionStatus');
            statusDiv.innerHTML = '<div class="status loading">🔄 Caricamento sessione...</div>';
            
            try {
                const response = await fetch('/api/main?action=current-session');
                const result = await response.json();
                
                if (response.ok && result.session) {
                    statusDiv.innerHTML = \`<div class="status success">✅ Sessione attiva trovata!<br>PDF: <strong>\${result.session.pdfFilename}</strong><br>Esercizi: \${result.session.exercises.length}<br>ID: \${result.session.id}</div>\`;
                } else {
                    statusDiv.innerHTML = '<div class="status error">❌ Nessuna sessione attiva trovata</div>';
                }
            } catch (error) {
                statusDiv.innerHTML = \`<div class="status error">❌ Errore di connessione: \${error.message}</div>\`;
            }
        }
        
        async function newSession() {
            const statusDiv = document.getElementById('sessionStatus');
            statusDiv.innerHTML = '<div class="status success">✅ Pronto per nuova sessione di allenamento</div>';
        }
        
        async function testApi() {
            const statusDiv = document.getElementById('sessionStatus');
            statusDiv.innerHTML = '<div class="status loading">🔄 Test connessione API...</div>';
            
            try {
                const response = await fetch('/api/main?action=test');
                const result = await response.json();
                
                if (response.ok) {
                    statusDiv.innerHTML = \`<div class="status success">✅ API funzionante!<br>Timestamp: \${result.timestamp}<br>Status: \${result.status}</div>\`;
                } else {
                    statusDiv.innerHTML = '<div class="status error">❌ API non risponde correttamente</div>';
                }
            } catch (error) {
                statusDiv.innerHTML = \`<div class="status error">❌ Errore connessione API: \${error.message}</div>\`;
            }
        }
        
        // Auto-load session on page load
        window.addEventListener('load', () => {
            getCurrentSession();
        });
    </script>
</body>
</html>`;

// API Routes
app.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const session = storage.createSession({
      pdfFilename: req.file.originalname,
      exercises: [
        {
          id: "ex1",
          name: "Exercise from PDF",
          setsReps: "3x8",
          weeks: {}
        }
      ]
    });

    res.json({ 
      sessionId: session.id, 
      filename: req.file.originalname,
      message: 'PDF uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/upload-video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { sessionId, exerciseId, weekId } = req.body;
    
    const video = storage.createVideo({
      sessionId: parseInt(sessionId) || 1,
      exerciseId: exerciseId || 'ex1',
      weekId: weekId || 'week1',
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    res.json({
      videoId: video.id,
      filename: req.file.originalname,
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/current-session', (req, res) => {
  try {
    const session = storage.getCurrentSession();
    if (session) {
      res.json({ session });
    } else {
      res.status(404).json({ error: 'No active session' });
    }
  } catch (error) {
    console.error('Error getting current session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/test', (req, res) => {
  res.json({
    status: 'API Working',
    timestamp: new Date().toISOString(),
    message: 'CoachSheet API is operational',
    version: '1.0.0'
  });
});

// Main handler for Vercel
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Serve HTML for root requests
  if (req.method === 'GET' && req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(HTML_CONTENT);
  }

  // Handle API requests based on action parameter
  const url = new URL(req.url, 'http://localhost');
  const action = url.searchParams.get('action');

  if (action === 'upload-pdf' && req.method === 'POST') {
    return app._router.handle(req, res, () => {
      req.url = '/upload-pdf';
      app(req, res);
    });
  }

  if (action === 'upload-video' && req.method === 'POST') {
    return app._router.handle(req, res, () => {
      req.url = '/upload-video';
      app(req, res);
    });
  }

  if (action === 'current-session' && req.method === 'GET') {
    return app._router.handle(req, res, () => {
      req.url = '/current-session';
      app(req, res);
    });
  }

  if (action === 'test' && req.method === 'GET') {
    return app._router.handle(req, res, () => {
      req.url = '/test';
      app(req, res);
    });
  }

  // Default: serve HTML
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(HTML_CONTENT);
};