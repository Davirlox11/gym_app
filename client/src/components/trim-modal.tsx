import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Scissors, X } from 'lucide-react';

interface TrimModalProps {
  blob: Blob;
  onSave: (path: string) => void;
  onCancel: () => void;
}

export function TrimModal({ blob, onSave, onCancel }: TrimModalProps) {
  const [url, setUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [start, setStart] = useState<number>(0);
  const [end, setEnd] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoUrl = URL.createObjectURL(blob);
    setUrl(videoUrl);
    
    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [blob]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEnd(videoDuration);
    }
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setStart(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setEnd(value);
    if (videoRef.current) {
      videoRef.current.currentTime = value;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSaveTrim = async () => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', blob, 'raw.webm');
      formData.append('t_in', start.toString());
      formData.append('t_out', end.toString());
      
      const response = await fetch('/api/manual-trim', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il taglio del video');
      }
      
      const data = await response.json();
      onSave(data.path);
    } catch (error) {
      console.error('Errore taglio video:', error);
      alert('Errore durante il taglio del video');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium">Modifica Video</h3>
          <p className="text-sm text-muted-foreground">
            Usa i cursori per tagliare inizio e fine del video
          </p>
        </div>

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            src={url}
            controls
            className="w-full h-full object-cover"
            onLoadedMetadata={handleLoadedMetadata}
          />
          
          {/* Timeline overlay simile a iOS */}
          <div className="absolute top-2 left-2 right-2">
            <div className="bg-black/70 rounded-lg p-2">
              <div className="flex space-x-0.5 mb-2">
                {Array.from({ length: 20 }, (_, i) => {
                  const frameTime = (i / 19) * duration;
                  const isInRange = frameTime >= start && frameTime <= end;
                  return (
                    <div
                      key={i}
                      className={`h-6 w-3 rounded-sm ${
                        isInRange 
                          ? 'bg-yellow-400/60 border border-yellow-400'
                          : 'bg-gray-500/40 border border-gray-500'
                      }`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center space-x-2 text-white text-xs">
                <span>{formatTime(start)}</span>
                <div className="flex-1 relative h-1 bg-white/30 rounded">
                  <div 
                    className="absolute top-0 w-1 h-full bg-yellow-400 rounded"
                    style={{ left: `${(start / duration) * 100}%` }}
                  />
                  <div 
                    className="absolute top-0 w-1 h-full bg-yellow-400 rounded"
                    style={{ left: `${(end / duration) * 100}%` }}
                  />
                </div>
                <span>{formatTime(end)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Inizio taglio: {formatTime(start)}
            </label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={start}
              onChange={handleStartChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              Fine taglio: {formatTime(end)}
            </label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={end}
              onChange={handleEndChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Durata finale: {formatTime(end - start)}
          </div>
        </div>

        <div className="flex justify-between">
          <Button onClick={onCancel} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Annulla
          </Button>
          
          <Button
            onClick={handleSaveTrim}
            disabled={isProcessing || start >= end}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
            ) : (
              <Scissors className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'Elaborazione...' : 'Salva taglio'}
          </Button>
        </div>
      </div>
    </div>
  );
}