import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Square, Scissors, Check, X } from 'lucide-react';

interface VideoEditorProps {
  videoFile: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
}

export function VideoEditor({ videoFile, onSave, onCancel }: VideoEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndTime(videoDuration);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = value[0];
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const handleTrimStart = useCallback((value: number[]) => {
    setStartTime(value[0]);
  }, []);

  const handleTrimEnd = useCallback((value: number[]) => {
    setEndTime(value[0]);
  }, []);

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const trimVideo = useCallback(async () => {
    if (!videoRef.current) return;

    setIsProcessing(true);
    
    try {
      // Per ora restituiamo il file originale con i metadati di trim
      // In una implementazione più avanzata si potrebbe usare FFmpeg.js
      const trimmedFile = new File([videoFile], `trimmed_${videoFile.name}`, {
        type: videoFile.type
      });
      
      // Aggiungi metadata per il trimming (per future implementazioni)
      (trimmedFile as any).trimStart = startTime;
      (trimmedFile as any).trimEnd = endTime;
      
      onSave(trimmedFile);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('Errore durante il trimming:', error);
      setIsProcessing(false);
    }
  }, [startTime, endTime, videoFile, onSave]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Modifica Video</h3>
        <p className="text-sm text-muted-foreground">
          Trascina i cursori gialli per tagliare il video
        </p>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          muted
        />
        
        {/* Timeline frame-by-frame come iOS */}
        <div className="absolute top-2 left-2 right-2">
          <div className="bg-black/70 rounded-lg p-2">
            {/* Visualizzazione frame-by-frame simulata */}
            <div className="flex space-x-0.5 mb-2">
              {Array.from({ length: 20 }, (_, i) => {
                const frameTime = (i / 19) * duration;
                const isActive = Math.abs(frameTime - currentTime) < duration / 40;
                const isInRange = frameTime >= startTime && frameTime <= endTime;
                return (
                  <div
                    key={i}
                    className={`h-8 w-4 rounded-sm border ${
                      isActive 
                        ? 'border-white bg-white/30' 
                        : isInRange 
                          ? 'border-yellow-400 bg-yellow-400/20'
                          : 'border-gray-500 bg-gray-500/20'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex items-center space-x-2 text-white text-xs">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 relative h-2 bg-white/30 rounded">
                <div 
                  className="absolute h-full bg-white rounded transition-all duration-100"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {/* Cursori di taglio gialli come iOS */}
                <div 
                  className="absolute top-0 w-1 h-full bg-yellow-400 rounded"
                  style={{ left: `${(startTime / duration) * 100}%` }}
                />
                <div 
                  className="absolute top-0 w-1 h-full bg-yellow-400 rounded"
                  style={{ left: `${(endTime / duration) * 100}%` }}
                />
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Controlli di riproduzione centrali */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            onClick={togglePlayPause}
            variant="secondary"
            size="lg"
            className="rounded-full w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-2 border-white/40"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <Play className="h-8 w-8 text-white ml-1" />
            )}
          </Button>
        </div>

        {/* Controlli inferiori come iOS */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <Button
            onClick={onCancel}
            variant="ghost"
            className="text-white hover:bg-white/20"
          >
            Annulla
          </Button>
          <div className="text-white text-sm font-medium">
            {formatTime(endTime - startTime)}
          </div>
          <Button
            onClick={trimVideo}
            disabled={isProcessing || startTime >= endTime}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
          >
            {isProcessing ? 'Elaborazione...' : 'Fine'}
          </Button>
        </div>
      </div>

      {/* Controlli di taglio semplificati */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">Taglia inizio e fine del video</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Slider
                value={[startTime]}
                onValueChange={handleTrimStart}
                max={duration}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">Inizio: {formatTime(startTime)}</span>
            </div>
            
            <div>
              <Slider
                value={[endTime]}
                onValueChange={handleTrimEnd}
                max={duration}
                step={0.1}
                className="w-full"
              />
              <span className="text-xs text-muted-foreground">Fine: {formatTime(endTime)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}