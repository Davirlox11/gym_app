import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Send, Loader2, Video, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildSharePayload } from '../utils/sharePayload';
import { Exercise, VideoUpload } from '../types';

interface ShareButtonProps {
  exercises: Exercise[];
  videos: VideoUpload[];
  selectedDay: string;
  onTelegramSend?: () => void;
  sendState?: 'idle' | 'sending' | 'success' | 'error';
  customSummaryText?: string;
}

export function ShareButton({ 
  exercises, 
  videos, 
  selectedDay, 
  onTelegramSend,
  sendState = 'idle',
  customSummaryText
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handleShareVideos = async () => {
    if (!videos.length) {
      toast({
        title: "Nessun video",
        description: "Carica almeno un video prima di condividere.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    try {
      console.log('Starting video share process...');
      const { files } = await buildSharePayload(exercises, videos, selectedDay);
      console.log('Files prepared for sharing:', files.length, files.map(f => ({ name: f.name, size: f.size, type: f.type })));

      if (files.length === 0) {
        console.error('No files to share');
        toast({
          title: "Errore caricamento video",
          description: "Impossibile caricare i file video.",
          variant: "destructive",
        });
        return;
      }

      // Check if browser supports sharing these specific files
      if ('share' in navigator && navigator.canShare) {
        console.log('Browser supports sharing API');
        const canShareTheseFiles = navigator.canShare({ files });
        console.log('Can share these specific files:', canShareTheseFiles);
        
        if (canShareTheseFiles) {
          console.log('Attempting to share files...');
          try {
            await navigator.share({
              files: files
            });
            
            console.log('Share completed successfully');
            toast({
              title: "Video condivisi",
              description: `${files.length} video condivisi con successo.`,
            });
          } catch (shareError) {
            console.error('Share failed:', shareError);
            toast({
              title: "Condivisione annullata",
              description: "La condivisione è stata annullata dall'utente.",
              variant: "destructive",
            });
          }
        } else {
          console.error('Browser cannot share these file types');
          toast({
            title: "File non supportati",
            description: "Il browser non può condividere questi tipi di file.",
            variant: "destructive",
          });
        }
      } else {
        console.error('Browser does not support sharing API');
        toast({
          title: "Condivisione non supportata",
          description: "Il tuo browser non supporta la condivisione di file.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Video sharing error:', error);
      
      if (error.name !== 'AbortError') {
        let errorMessage = "Impossibile condividere i video. Riprova.";
        
        // More specific error messages
        if (error.message?.includes('fetch')) {
          errorMessage = "Errore nel caricamento dei video dal server.";
        } else if (error.message?.includes('canShare')) {
          errorMessage = "I file video non sono supportati per la condivisione.";
        }
        
        toast({
          title: "Errore condivisione video",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareSummary = () => {
    if (!exercises.length) {
      toast({
        title: "Nessun esercizio",
        description: "Seleziona prima un giorno di allenamento.",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);

    // Usa il testo personalizzato se fornito, altrimenti genera automaticamente
    let text = customSummaryText || '';
    
    if (!customSummaryText) {
      // Generazione automatica del testo (fallback)
      const exerciseData = exercises.map(exercise => {
        const exerciseVideos = videos.filter(video => video.exerciseId === exercise.id);
        const rpeValues = Object.values(exercise.weeks || {})
          .map((week: any) => week.rpe)
          .filter(Boolean);
        
        if (exerciseVideos.length === 0 && rpeValues.length === 0) return null;
        
        // Trova contenuto settimana usando la stessa logica del riepilogo
        let weekContent = '';
        const exerciseWeeksWithData = Object.entries(exercise.weeks || {}).filter(([weekId, weekData]: [string, any]) => {
          const hasVideo = exerciseVideos.some((v: any) => v.weekId === weekId);
          const hasRPE = weekData.rpe;
          return hasVideo || hasRPE;
        });
        
        if (exerciseWeeksWithData.length > 0) {
          const [weekId, weekData] = exerciseWeeksWithData[0];
          const typedWeekData = weekData as any;
          
          if (typedWeekData.weight && typedWeekData.weight.trim()) {
            weekContent = typedWeekData.weight.trim();
          } else {
            // La settimana è vuota ma ha RPE/video, trova l'ultima settimana con contenuto
            const weekNumbers = ['settimana_1', 'settimana_2', 'settimana_3', 'settimana_4', 'settimana_5'];
            
            for (let i = weekNumbers.length - 1; i >= 0; i--) {
              const weekKey = weekNumbers[i];
              const weekContent_data = exercise.weeks?.[weekKey] as any;
              if (weekContent_data?.weight && weekContent_data.weight.trim()) {
                weekContent = weekContent_data.weight.trim();
                break;
              }
            }
          }
        }
        
        return {
          name: exercise.name,
          weekContent,
          videoCount: exerciseVideos.length,
          rpeValues
        };
      }).filter((data): data is NonNullable<typeof data> => data !== null);

      if (exerciseData.length === 0) {
        text = 'Nessun dato di allenamento disponibile';
      } else {
        text = exerciseData.map(data => {
          if (!data) return '';
          let line = data.name;
          if (data.weekContent) line += ` - ${data.weekContent}`;
          
          const info = [];
          if (data.rpeValues.length > 0) info.push(`RPE ${data.rpeValues.join(', ')}`);
          if (info.length > 0) line += ` (${info.join(' | ')})`;
          
          return line;
        }).filter(Boolean).join('\n\n');
      }
    }

    // Avvia condivisione e resetta immediatamente
    if ('share' in navigator) {
      navigator.share({
        text: text,
        title: "Riepilogo Allenamento"
      });
    } else {
      // Fallback per browser senza supporto
      const encoded = encodeURIComponent(text);
      window.open(`https://t.me/share/url?text=${encoded}`, "_blank");
    }
    
    // Reset immediato senza attendere risultato
    setIsSharing(false);
    toast({
      title: "Condivisione avviata",
      description: "Seleziona l'app di destinazione.",
    });
  };

  const hasVideos = videos.length > 0;
  
  // Controlla se ci sono dati significativi (video o RPE)
  const hasData = exercises.some(exercise => {
    const exerciseVideos = videos.filter(video => video.exerciseId === exercise.id);
    const rpeValues = Object.values(exercise.weeks || {})
      .map((week: any) => week.rpe)
      .filter(Boolean);
    return exerciseVideos.length > 0 || rpeValues.length > 0;
  });
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          onClick={handleShareVideos}
          disabled={!hasVideos || isSharing}
          className="flex-1 text-sm py-2"
          variant="default"
          size="sm"
        >
          {isSharing ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Video className="h-3 w-3 mr-1" />
          )}
          {isSharing ? 'Condivisione...' : `Video (${videos.length})`}
        </Button>

        <Button
          onClick={handleShareSummary}
          disabled={!hasData || isSharing}
          className="flex-1 text-sm py-2"
          variant="outline"
          size="sm"
        >
          {isSharing ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <FileText className="h-3 w-3 mr-1" />
          )}
          {isSharing ? 'Condivisione...' : 'Riepilogo'}
        </Button>
      </div>

      {onTelegramSend && (
        <Button
          onClick={onTelegramSend}
          disabled={!hasData || sendState === 'sending'}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          {sendState === 'sending' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Invio Automatico Telegram
        </Button>
      )}
    </div>
  );
}