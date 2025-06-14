import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VideoIcon, Upload, X, Camera, Star, FileText, Trash2 } from 'lucide-react';
import { Exercise, VideoUpload } from '../types';

interface ExerciseTableProps {
  exercises: Exercise[];
  selectedDay?: string;
  videos: VideoUpload[];
  onVideoUpload: (exerciseId: string, weekId: string, file: File) => void;
  onRPEChange: (exerciseId: string, weekId: string, rpe: number) => void;
  onNotesChange: (exerciseId: string, notes: string) => void;
  onVideoRemove: (videoId: number) => void;
  isEditing?: boolean;
}

export function ExerciseTable({ 
  exercises, 
  selectedDay, 
  videos, 
  onVideoUpload, 
  onRPEChange, 
  onNotesChange,
  onVideoRemove,
  isEditing = false
}: ExerciseTableProps) {
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({});
  const [localRPEValues, setLocalRPEValues] = useState<Record<string, number>>({});

  if (!selectedDay || exercises.length === 0) return null;

  const handleVideoUpload = async (exerciseId: string, weekId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Il video deve essere inferiore a 50MB');
      return;
    }

    const key = `${exerciseId}-${weekId}`;
    setUploadingStates(prev => ({ ...prev, [key]: true }));

    try {
      await onVideoUpload(exerciseId, weekId, file);
    } catch (error) {
      console.error('Errore caricamento video:', error);
    } finally {
      setUploadingStates(prev => ({ ...prev, [key]: false }));
    }
  };



  const getVideoForExerciseWeek = (exerciseId: string, weekId: string) => {
    return videos.find(video => video.exerciseId === exerciseId && video.weekId === weekId);
  };

  // Trova tutte le chiavi delle settimane disponibili
  const allWeekKeys = new Set<string>();
  exercises.forEach(exercise => {
    Object.keys(exercise.weeks || {}).forEach(weekKey => {
      allWeekKeys.add(weekKey);
    });
  });
  
  // Converte le chiavi e le ordina
  const weekIds = Array.from(allWeekKeys).sort((a, b) => {
    const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
    const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
    return aNum - bNum;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Modifica Scheda - {selectedDay}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3 font-medium min-w-[200px] border-r border-border">
                    Esercizio
                  </th>
                  {weekIds.map((weekId) => [
                      <th key={`${weekId}-header`} className="text-center p-3 font-medium min-w-[120px] border-r border-border">
                        {weekId.replace('settimana_', 'Sett. ')}
                      </th>,
                      <th key={`${weekId}-video-header`} className="text-center p-3 font-medium min-w-[100px] border-r border-border">
                        Video
                      </th>,
                      <th key={`${weekId}-rpe-header`} className="text-center p-3 font-medium min-w-[80px] border-r border-border">
                        RPE
                      </th>
                    ]
                  )}
                  <th className="text-center p-3 font-medium min-w-[100px] border-r border-border">
                    Recupero
                  </th>

                </tr>
              </thead>
              <tbody>
                {exercises.map((exercise, exerciseIndex) => (
                  <tr key={exercise.id} className={`${exerciseIndex < exercises.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/20`}>
                    {/* Colonna Esercizio */}
                    <td className="p-3 align-top border-r border-border">
                      <div>
                        {isEditing ? (
                          <Input 
                            value={exercise.name}
                            className="text-sm font-medium mb-2"
                            placeholder="Nome esercizio"
                            onChange={(e) => {
                              // TODO: Implementare onChange per nome esercizio
                            }}
                          />
                        ) : (
                          <div className="font-medium text-sm">{exercise.name}</div>
                        )}
                        
                        {/* Rimuovo Sets/Reps dalla colonna primaria - appariranno solo nelle colonne settimane */}
                        
                        {/* Note dal PDF sotto sets/reps se presenti */}
                        {exercise.note && (
                          <div className="text-xs text-blue-600 mt-1 italic">
                            {exercise.note}
                          </div>
                        )}
                        
                        {/* Note dell'utente se presenti */}
                        {exercise.notes && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            {exercise.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Per ogni settimana: 3 colonne (Settimana, Video, RPE) */}
                    {weekIds.map((weekId, weekIndex) => {
                      const exerciseWeek = exercise.weeks?.[weekId];
                      const video = getVideoForExerciseWeek(exercise.id, weekId);
                      const uploadKey = `${exercise.id}-${weekId}`;
                      
                      const weekCells = [
                        // Colonna Settimana (peso/carico)
                        <td key={`${weekId}-weight`} className="p-3 align-top border-r border-border">
                          {isEditing ? (
                            <Input 
                              value={exerciseWeek?.weight || ''}
                              placeholder="Es: 3 x 6"
                              className="text-sm text-center"
                              onChange={(e) => {
                                // TODO: Implementare onChange per peso/carico
                              }}
                            />
                          ) : (
                            <div className="text-center text-sm p-2 bg-muted/30 rounded min-h-[32px] flex items-center justify-center">
                              {exerciseWeek?.weight || '-'}
                            </div>
                          )}
                        </td>,
                        
                        // Colonna Video
                        <td key={`${weekId}-video`} className="p-3 align-top border-r border-border">
                          {video ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                                <VideoIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate mx-2 flex-1">{video.originalName}</span>
                                <Button
                                  onClick={() => onVideoRemove(video.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="relative bg-black rounded overflow-hidden">
                                <video 
                                  className="w-full h-32 object-cover rounded"
                                  controls
                                  preload="metadata"
                                  src={`/uploads/${video.filename}`}
                                  onError={(e) => {
                                    console.error('Video load error for:', video.filename);
                                    // Fallback to API endpoint if direct upload path fails
                                    const videoElement = e.target as HTMLVideoElement;
                                    if (videoElement.src.includes('/uploads/')) {
                                      videoElement.src = `/api/video/${video.filename}`;
                                    }
                                  }}
                                >
                                  Il tuo browser non supporta i video.
                                </video>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => handleVideoUpload(exercise.id, weekId, e)}
                                  disabled={uploadingStates[uploadKey]}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-7 text-xs"
                                  disabled={uploadingStates[uploadKey]}
                                >
                                  {uploadingStates[uploadKey] ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                                  ) : (
                                    <Upload className="h-3 w-3 mr-1" />
                                  )}
                                  {uploadingStates[uploadKey] ? 'Caricamento...' : 'Carica'}
                                </Button>
                              </div>
                              <div className="relative">
                                <input
                                  type="file"
                                  accept="video/*"
                                  capture="environment"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  onChange={(e) => handleVideoUpload(exercise.id, weekId, e)}
                                  disabled={uploadingStates[uploadKey]}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-7 text-xs"
                                  disabled={uploadingStates[uploadKey]}
                                >
                                  {uploadingStates[uploadKey] ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                                  ) : (
                                    <Camera className="h-3 w-3 mr-1" />
                                  )}
                                  {uploadingStates[uploadKey] ? 'Caricamento...' : 'Registra'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </td>,
                        
                        // Colonna RPE
                        <td key={`${weekId}-rpe`} className="p-3 align-top border-r border-border">
                          <Select
                            value={localRPEValues[`${exercise.id}-${weekId}`]?.toString() || exerciseWeek?.rpe?.toString() || ''}
                            onValueChange={(value) => {
                              console.log('RPE change:', { exerciseId: exercise.id, weekId, value });
                              const rpeValue = parseInt(value);
                              if (!isNaN(rpeValue)) {
                                // Aggiorna immediatamente lo stato locale per la visualizzazione
                                setLocalRPEValues(prev => ({ ...prev, [`${exercise.id}-${weekId}`]: rpeValue }));
                                onRPEChange(exercise.id, weekId, rpeValue);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="RPE" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((rpe) => (
                                <SelectItem key={rpe} value={rpe.toString()}>
                                  {rpe}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      ];
                      
                      return weekCells;
                    })}
                    
                    {/* Colonna Recupero */}
                    <td className="p-3 align-top border-r border-border">
                      <div className="text-center text-sm p-2 bg-muted/30 rounded min-h-[32px] flex items-center justify-center">
                        {exercise.recupero || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}