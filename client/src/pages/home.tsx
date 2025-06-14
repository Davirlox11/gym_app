import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { RefreshCw, Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { PDFUpload } from '../components/pdf-upload';
import { DaySelection } from '../components/day-selection';
import { ExerciseTable } from '../components/exercise-table';
import { SendToCoach } from '../components/send-to-coach';

import * as api from '../lib/api';
// Define types locally since shared schema import is not working
interface Exercise {
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

interface WorkoutDay {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
}

interface WorkoutSession {
  id: number;
  pdfFilename: string;
  selectedDay?: string | null;
  exercises: Exercise[];
  workoutData?: any;
  createdAt: string;
}

interface VideoUpload {
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

type UploadState = 'idle' | 'uploading' | 'success' | 'error';
type SendState = 'idle' | 'sending' | 'success' | 'error';

export default function Home() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [availableDays, setAvailableDays] = useState<WorkoutDay[]>([]);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [videos, setVideos] = useState<VideoUpload[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load current session on mount
  const { data: sessionData } = useQuery({
    queryKey: ['/api/current-session'],
    enabled: true,
  });

  useEffect(() => {
    if (sessionData && typeof sessionData === 'object') {
      const data = sessionData as any;
      if (data.session) {
        setCurrentSession(data.session);
        setUploadState('success');
      }
      if (data.videos) {
        setVideos(data.videos);
      }
    }
  }, [sessionData]);

  const uploadPDFMutation = useMutation({
    mutationFn: api.uploadPDF,
    onMutate: () => {
      setUploadState('uploading');
      setUploadProgress(0);
      
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);
    },
    onSuccess: (data) => {
      setUploadState('success');
      setUploadProgress(100);
      
      // Create available days from PDF pages
      const days = data.pages.map((page: any) => ({
        id: `day-${page.pageNumber}`,
        name: `Giorno ${page.pageNumber}`,
        description: page.title,
        exercises: page.exercises
      }));
      setAvailableDays(days);
      
      // Create session object with the returned session ID
      const session = {
        id: data.sessionId,
        pdfFilename: data.filename,
        selectedDay: undefined,
        exercises: [],
        createdAt: new Date().toISOString()
      };
      setCurrentSession(session);
      
      toast({
        title: "PDF caricato con successo",
        description: `File: ${data.filename} - ${days.length} giorni trovati`,
      });
    },
    onError: (error) => {
      setUploadState('error');
      setUploadProgress(0);
      toast({
        title: "Errore nel caricamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectDayMutation = useMutation({
    mutationFn: ({ dayId, exercises }: { dayId: string; exercises: Exercise[] }) => 
      api.selectDay(currentSession?.id || 0, dayId, exercises),
    onSuccess: (data, variables) => {
      setCurrentSession(data.session);
      toast({
        title: "Giorno selezionato",
        description: `Hai selezionato: ${variables.dayId}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore nella selezione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadVideoMutation = useMutation({
    mutationFn: ({ exerciseId, weekId, file }: { exerciseId: string; weekId: string; file: File }) =>
      api.uploadVideo(currentSession?.id || 0, exerciseId, weekId, file),
    onSuccess: (data, variables) => {
      const newVideo: VideoUpload = {
        id: data.videoId,
        sessionId: currentSession?.id || 0,
        exerciseId: variables.exerciseId,
        weekId: variables.weekId,
        filename: data.filename,
        originalName: data.originalName,
        mimeType: variables.file.type,
        size: variables.file.size,
        uploadedAt: new Date().toISOString(),
      };
      setVideos(prev => [...prev, newVideo]);
      toast({
        title: "Video caricato",
        description: `File: ${data.originalName}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Errore caricamento video",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateExerciseMutation = useMutation({
    mutationFn: ({ exerciseId, weekId, data }: { exerciseId: string; weekId: string; data: any }) =>
      api.updateExercise(currentSession?.id || 0, exerciseId, weekId, data),
    onSuccess: (data) => {
      setCurrentSession(data.session);
    },
    onError: (error) => {
      toast({
        title: "Errore aggiornamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendToTelegramMutation = useMutation({
    mutationFn: api.sendToTelegram,
    onMutate: () => {
      setSendState('sending');
    },
    onSuccess: () => {
      setSendState('success');
      toast({
        title: "Messaggio inviato!",
        description: "Il tuo coach ha ricevuto la scheda con i video.",
      });
    },
    onError: (error) => {
      setSendState('error');
      toast({
        title: "Errore invio Telegram",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restartMutation = useMutation({
    mutationFn: api.restartApp,
    onSuccess: () => {
      // Reset completo dello stato
      setUploadState('idle');
      setSendState('idle');
      setUploadProgress(0);
      setAvailableDays([]);
      setCurrentSession(null);
      setVideos([]);
      
      // Rimuovi cache e forza refetch
      queryClient.removeQueries({ queryKey: ['/api/current-session'] });
      queryClient.invalidateQueries({ queryKey: ['/api/current-session'] });
      
      toast({
        title: "Applicazione riavviata",
        description: "Puoi caricare una nuova scheda PDF.",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore riavvio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (file: File) => {
    uploadPDFMutation.mutate(file);
  };

  const handleDaySelect = (dayId: string, exercises: Exercise[]) => {
    console.log('Day selection attempt:', { dayId, sessionId: currentSession?.id, exercisesCount: exercises.length });
    
    if (!currentSession?.id) {
      toast({
        title: "Errore",
        description: "Nessuna sessione attiva trovata",
        variant: "destructive",
      });
      return;
    }
    selectDayMutation.mutate({ dayId, exercises });
  };

  const handleVideoUpload = (exerciseId: string, weekId: string, file: File) => {
    uploadVideoMutation.mutate({ exerciseId, weekId, file });
  };

  const handleRPEChange = (exerciseId: string, weekId: string, rpe: number) => {
    updateExerciseMutation.mutate({ exerciseId, weekId, data: { rpe } });
  };

  const handleNotesChange = (exerciseId: string, notes: string) => {
    updateExerciseMutation.mutate({ exerciseId, weekId: 'general', data: { notes } });
  };

  const handleVideoRemove = (videoId: number) => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
    toast({
      title: "Video rimosso",
      description: "Il video è stato rimosso dalla scheda.",
    });
  };

  const handleSendToTelegram = () => {
    sendToTelegramMutation.mutate();
  };

  const handleRestart = () => {
    restartMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-background shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Dumbbell className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-medium">CoachSheet</h1>
                <p className="text-xs text-muted-foreground">Gestione Schede di Allenamento</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={restartMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
              Ricomincia
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Step 1: PDF Upload */}
        <PDFUpload
          uploadState={uploadState}
          uploadProgress={uploadProgress}
          fileName={currentSession?.pdfFilename}
          onFileUpload={handleFileUpload}
        />

        {/* Step 2: Day Selection */}
        {uploadState === 'success' && availableDays.length > 0 && (
          <DaySelection
            days={availableDays}
            selectedDay={currentSession?.selectedDay ?? undefined}
            onDaySelect={handleDaySelect}
          />
        )}

        {/* Step 3: Exercise Table */}
        {currentSession?.selectedDay && currentSession.exercises.length > 0 && (
          <ExerciseTable
            exercises={currentSession.exercises}
            selectedDay={currentSession.selectedDay}
            videos={videos}
            onVideoUpload={handleVideoUpload}
            onRPEChange={handleRPEChange}
            onNotesChange={handleNotesChange}
            onVideoRemove={handleVideoRemove}
          />
        )}

        {/* Step 4: Send to Coach */}
        {currentSession?.selectedDay && currentSession.exercises.length > 0 && (
          <SendToCoach
            exercises={currentSession.exercises}
            videos={videos}
            sendState={sendState}
            selectedDay={currentSession.selectedDay}
            onSendToTelegram={handleSendToTelegram}
          />
        )}
      </main>
    </div>
  );
}
