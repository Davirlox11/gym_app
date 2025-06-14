import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { VideoIcon, Square, Play, Upload, Pause, RotateCcw } from 'lucide-react';

interface VideoRecorderProps {
  onVideoRecorded: (file: File) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function VideoRecorder({ onVideoRecorded, onCancel, isUploading }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startCamera = useCallback(async () => {
    try {
      console.log('Tentativo di accesso alla fotocamera...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      console.log('Fotocamera ottenuta con successo:', stream);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          console.log('Fotocamera pronta per la registrazione');
        };
        console.log('Stream assegnato al video element');
      }
    } catch (error) {
      console.error('Errore accesso fotocamera:', error);
      alert('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
    }
  }, [facingMode]);

  const startRecording = useCallback(() => {
    console.log('Tentativo di avvio registrazione...', streamRef.current);
    if (!streamRef.current) {
      console.error('Nessuno stream disponibile per la registrazione');
      return;
    }

    chunksRef.current = [];
    // Prova diversi formati per compatibilità, preferendo mp4
    let mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }
    }
    
    const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

    console.log('MediaRecorder creato:', mediaRecorder);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedVideo(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
      // Ferma lo stream della fotocamera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    mediaRecorder.start();
    console.log('Registrazione avviata!');
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      console.log('Registrazione in pausa');
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      console.log('Registrazione ripresa');
    }
  }, [isRecording, isPaused]);

  const toggleCamera = useCallback(async () => {
    // Ferma lo stream corrente
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Cambia modalità fotocamera
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    setCameraReady(false);
    
    // Riavvia la fotocamera con la nuova modalità
    // La callback startCamera si aggiorna automaticamente tramite useEffect
  }, [facingMode]);

  const handleUpload = useCallback(() => {
    if (recordedVideo) {
      // Determina l'estensione del file basata sul tipo MIME
      const fileExtension = recordedVideo.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([recordedVideo], `video-${Date.now()}.${fileExtension}`, {
        type: recordedVideo.type
      });
      onVideoRecorded(file);
    }
  }, [recordedVideo, onVideoRecorded]);

  const handleCancel = useCallback(() => {
    // Pulisci tutto
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setIsRecording(false);
    setRecordedVideo(null);
    setPreviewUrl(null);
    onCancel();
  }, [previewUrl, onCancel]);

  // Avvia automaticamente la fotocamera quando il componente viene montato o cambia la modalità
  useEffect(() => {
    startCamera();
    
    // Cleanup quando il componente viene smontato
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [startCamera]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Registra Video</h3>
        <p className="text-sm text-muted-foreground">
          {!recordedVideo ? (
            cameraReady ? 'Usa la fotocamera per registrare il tuo esercizio' : 'Attivazione fotocamera in corso...'
          ) : 'Video registrato - pronto per il caricamento'}
        </p>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {!recordedVideo ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={previewUrl || undefined}
            controls
            className="w-full h-full object-cover"
          />
        )}
        
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}></div>
            <span className="text-white text-sm font-medium">{isPaused ? 'PAUSE' : 'REC'}</span>
          </div>
        )}
        
        {!recordedVideo && (
          <div className="absolute top-4 right-4">
            <Button
              onClick={toggleCamera}
              variant="secondary"
              size="sm"
              disabled={isRecording}
              className="opacity-80 hover:opacity-100"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-center space-x-4">
        {!recordedVideo ? (
          <>
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              disabled={!cameraReady}
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Ferma
                </>
              ) : (
                <>
                  <VideoIcon className="h-4 w-4 mr-2" />
                  {cameraReady ? 'Registra' : 'Caricamento...'}
                </>
              )}
            </Button>
            
            {isRecording && (
              <Button
                onClick={isPaused ? resumeRecording : pauseRecording}
                variant="secondary"
                size="lg"
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Riprendi
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausa
                  </>
                )}
              </Button>
            )}
            
            <Button onClick={handleCancel} variant="outline" size="lg">
              Annulla
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleUpload}
              size="lg"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isUploading ? 'Caricamento...' : 'Carica Video'}
            </Button>
            <Button
              onClick={() => {
                setRecordedVideo(null);
                setPreviewUrl(null);
                startCamera();
              }}
              variant="outline"
              size="lg"
            >
              <VideoIcon className="h-4 w-4 mr-2" />
              Registra di nuovo
            </Button>
            <Button onClick={handleCancel} variant="outline" size="lg">
              Annulla
            </Button>
          </>
        )}
      </div>
    </div>
  );
}