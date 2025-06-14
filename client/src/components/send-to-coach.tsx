import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Paperclip, Info } from 'lucide-react';
import { ShareButton } from './share-button';
import { Exercise, VideoUpload, SendState } from '../types';

interface SendToCoachProps {
  exercises: Exercise[];
  videos: VideoUpload[];
  sendState: SendState;
  selectedDay?: string;
  onSendToTelegram: () => void;
}

export function SendToCoach({ exercises, videos, sendState, selectedDay, onSendToTelegram }: SendToCoachProps) {
  // Show component if there are exercises, even without videos
  if (exercises.length === 0) return null;

  // Get exercises that have videos for the summary
  const exercisesWithVideos = exercises.filter(exercise => 
    Object.keys(exercise.weeks).some(weekId => 
      videos.some(video => video.exerciseId === exercise.id && video.weekId === weekId)
    )
  );

  const generateSummary = () => {
    return exercisesWithVideos.map(exercise => {
      const weekEntries = Object.entries(exercise.weeks).filter(([weekId]) =>
        videos.some(video => video.exerciseId === exercise.id && video.weekId === weekId)
      );

      return weekEntries.map(([weekId, weekData]) => {
        const rpeText = weekData.rpe ? ` – RPE: ${weekData.rpe}` : ' – RPE: Non specificato';
        return `${exercise.name} – ${exercise.setsReps}${rpeText}`;
      });
    }).flat();
  };

  const summaryLines = generateSummary();
  const videoCount = videos.length;

  return (
    <div className="mb-8">
      <Card className="overflow-hidden">
        <div className="px-6 py-4 bg-muted/50 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
              <span className="text-primary-foreground text-sm font-medium">4</span>
            </div>
            <h2 className="text-lg font-medium">Invia al Coach</h2>
          </div>
        </div>
        
        <CardContent className="p-6">
          {/* Summary Preview */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium mb-3">Riepilogo da inviare:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {summaryLines.map((line, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
            {videoCount > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span>{videoCount} video allegati</span>
                </div>
              </div>
            )}
          </div>

          {/* Share Actions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Scegli come condividere la scheda con il tuo coach</span>
            </div>
            
            <ShareButton
              exercises={exercises}
              videos={videos}
              selectedDay={selectedDay || 'Allenamento'}
              onTelegramSend={onSendToTelegram}
              sendState={sendState}
            />
          </div>

          {/* Success State */}
          {sendState === 'success' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Messaggio inviato con successo!</p>
                  <p className="text-xs text-green-600">Il tuo coach ha ricevuto la scheda con i video allegati.</p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {sendState === 'error' && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Errore nell'invio del messaggio</p>
                  <p className="text-xs text-red-600">Verifica la connessione e riprova. Se il problema persiste, contatta il supporto.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
