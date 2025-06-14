import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Play, Pause, Square, Video } from 'lucide-react';

interface RecorderModalProps {
  onRecorded: (blob: Blob) => void;
  onCancel: () => void;
}

export function RecorderModal({ onRecorded, onCancel }: RecorderModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [status, setStatus] = useState<'idle' | 'rec' | 'pause'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error('Errore accesso fotocamera:', err);
        alert('Impossibile accedere alla fotocamera');
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (!stream) return;
    
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        setChunks(prev => [...prev, e.data]);
      }
    };
    
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      onRecorded(blob);
    };
    
    recorder.start();
    setRec(recorder);
    setStatus('rec');
  };

  const pauseRecording = () => {
    if (rec && status === 'rec') {
      rec.pause();
      setStatus('pause');
    }
  };

  const resumeRecording = () => {
    if (rec && status === 'pause') {
      rec.resume();
      setStatus('rec');
    }
  };

  const stopRecording = () => {
    if (rec) {
      rec.stop();
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium">Registra Video</h3>
          <p className="text-sm text-muted-foreground">
            Usa i controlli per registrare il tuo esercizio
          </p>
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          
          {status === 'rec' && (
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">REC</span>
            </div>
          )}
          
          {status === 'pause' && (
            <div className="absolute top-4 left-4 flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-white text-sm font-medium">PAUSE</span>
            </div>
          )}
        </div>

        <div className="flex justify-center space-x-3 mb-4">
          {status === 'idle' && (
            <Button
              onClick={startRecording}
              disabled={!stream}
              className="bg-red-500 hover:bg-red-600"
            >
              <Play className="h-4 w-4 mr-2" />
              Avvia
            </Button>
          )}
          
          {status === 'rec' && (
            <>
              <Button
                onClick={pauseRecording}
                variant="secondary"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pausa
              </Button>
              <Button
                onClick={stopRecording}
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Fine
              </Button>
            </>
          )}
          
          {status === 'pause' && (
            <>
              <Button
                onClick={resumeRecording}
                className="bg-green-500 hover:bg-green-600"
              >
                <Play className="h-4 w-4 mr-2" />
                Riprendi
              </Button>
              <Button
                onClick={stopRecording}
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Fine
              </Button>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onCancel} variant="outline">
            Annulla
          </Button>
        </div>
      </div>
    </div>
  );
}