import { Exercise, VideoUpload } from '../types';

export interface SharePayload {
  text: string;
  files: File[];
}

export async function buildSharePayload(
  exercises: Exercise[], 
  videos: VideoUpload[], 
  selectedDay: string,
  includeFiles: boolean = true
): Promise<SharePayload> {
  const textLines: string[] = [];
  const files: File[] = [];

  // Aggiungi intestazione per il testo di condivisione
  textLines.push(`🏋️ Riepilogo Allenamento - ${selectedDay}`);
  textLines.push('');

  // Per il testo, includi tutti gli esercizi con qualsiasi dato (video o RPE)
  const exercisesWithData = exercises.filter(exercise => {
    const hasVideo = videos.some(video => video.exerciseId === exercise.id);
    const hasRPE = Object.values(exercise.weeks || {}).some((week: any) => week.rpe);
    return hasVideo || hasRPE;
  });

  if (exercisesWithData.length === 0) {
    textLines.push('Nessun dato di allenamento disponibile');
  } else {
    // Processa tutti gli esercizi con dati
    exercisesWithData.forEach((exercise, index) => {
      let line = exercise.name;
      
      // Aggiungi il contenuto delle settimane (peso/carico)
      const weekData = Object.entries(exercise.weeks || {});
      if (weekData.length > 0) {
        const weekInfo = weekData.map(([weekId, data]: [string, any]) => {
          let info = `${weekId}`;
          if (data.weight) {
            info += `: ${data.weight}`;
          }
          if (data.rpe) {
            info += ` (RPE: ${data.rpe})`;
          }
          return info;
        }).join(' | ');
        
        if (weekInfo) {
          line += `\n${weekInfo}`;
        }
      }
      
      // Conta i video per questo esercizio
      const exerciseVideos = videos.filter(video => video.exerciseId === exercise.id);
      if (exerciseVideos.length > 0) {
        line += `\n📹 Video: ${exerciseVideos.length}`;
      }
      
      textLines.push(line);

      // Aggiungi riga vuota tra esercizi (eccetto l'ultimo)
      if (index < exercisesWithData.length - 1) {
        textLines.push('');
      }
    });
  }

  // Convert video uploads to File objects for sharing only if includeFiles is true
  if (includeFiles) {
    console.log('Processing videos for sharing:', videos.length);
    for (const video of videos) {
      try {
        console.log(`Fetching video: ${video.filename}`);
        const response = await fetch(`/uploads/${video.filename}`);
        console.log(`Response status for ${video.filename}:`, response.status);
        
        if (response.ok) {
          const blob = await response.blob();
          console.log(`Blob created for ${video.filename}:`, blob.size, blob.type);
          
          // Ensure we have a valid MIME type
          const mimeType = video.mimeType || blob.type || 'video/mp4';
          
          const file = new File([blob], video.originalName, { 
            type: mimeType,
            lastModified: Date.now()
          });
          
          console.log(`File created for sharing:`, file.name, file.size, file.type);
          files.push(file);
        } else {
          console.warn(`Failed to fetch video: ${video.filename}, status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to load video file: ${video.filename}`, error);
      }
    }
    
    console.log('Total files prepared for sharing:', files.length);
  }

  return {
    text: textLines.join('\n'),
    files
  };
}

export function canShareFiles(): boolean {
  return !!(navigator.canShare && typeof navigator.canShare === 'function');
}

export function canShareWithFiles(files: File[]): boolean {
  if (!canShareFiles()) return false;
  
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}