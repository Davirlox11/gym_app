import React, { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Share2, RotateCcw, CheckCircle, VideoIcon, Edit3, Save, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ShareButton } from '@/components/share-button';

export function SummaryPage() {
  const [, navigate] = useLocation();
  const [isEditingText, setIsEditingText] = useState(false);
  const [editableText, setEditableText] = useState('');

  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/current-session'],
    queryFn: async () => {
      const response = await fetch('/api/current-session');
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      return data.session;
    }
  });

  const { data: videos = [] } = useQuery({
    queryKey: ['/api/videos', session?.id],
    queryFn: async () => {
      if (!session?.id) return [];
      const response = await fetch(`/api/videos?sessionId=${session.id}`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      return response.json();
    },
    enabled: !!session?.id
  });

  // Usa gli esercizi aggiornati dalla sessione invece dei dati originali dal PDF
  const sessionExercises = session?.exercises || [];
  
  const exercisesWithData = sessionExercises.filter((ex: any) => {
    const hasVideo = videos.some((v: any) => v.exerciseId === ex.id);
    const hasRPE = Object.values(ex.weeks || {}).some((week: any) => week.rpe);
    return hasVideo || hasRPE;
  });

  const totalExercises = sessionExercises.length;
  const completedExercises = exercisesWithData.length;
  const completionPercentage = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  // Calcola la media RPE della sessione usando gli esercizi aggiornati
  const allRPEValues: number[] = [];
  sessionExercises.forEach((exercise: any) => {
    Object.values(exercise.weeks || {}).forEach((week: any) => {
      if (week.rpe && typeof week.rpe === 'number') {
        allRPEValues.push(week.rpe);
      }
    });
  });
  const averageRPE = allRPEValues.length > 0 ? 
    (allRPEValues.reduce((sum, rpe) => sum + rpe, 0) / allRPEValues.length).toFixed(1) : 
    'N/A';

  // Genera il testo del riepilogo per modifica e condivisione
  const generateSummaryText = useMemo(() => {
    if (exercisesWithData.length === 0) return 'Nessun dato di allenamento disponibile';
    
    return exercisesWithData.map((exercise: any) => {
      const exerciseVideos = videos.filter((v: any) => v.exerciseId === exercise.id);
      const rpeValues = Object.values(exercise.weeks || {})
        .map((week: any) => week.rpe)
        .filter(Boolean);

      // Trova il contenuto della settimana per il riepilogo
      let exerciseWeekContent = '';
      const exerciseWeeksWithData = Object.entries(exercise.weeks || {}).filter(([weekId, weekData]: [string, any]) => {
        const hasVideo = exerciseVideos.some((v: any) => v.weekId === weekId);
        const hasRPE = weekData.rpe;
        return hasVideo || hasRPE;
      });
      
      if (exerciseWeeksWithData.length > 0) {
        const [weekId, weekData] = exerciseWeeksWithData[0];
        const typedWeekData = weekData as any;
        
        if (typedWeekData.weight && typedWeekData.weight.trim()) {
          exerciseWeekContent = typedWeekData.weight.trim();
        } else {
          // La settimana è vuota ma ha RPE/video, trova l'ultima settimana con contenuto
          const weekNumbers = ['settimana_1', 'settimana_2', 'settimana_3', 'settimana_4', 'settimana_5'];
          
          for (let i = weekNumbers.length - 1; i >= 0; i--) {
            const weekKey = weekNumbers[i];
            const weekContent = exercise.weeks?.[weekKey] as any;
            if (weekContent?.weight && weekContent.weight.trim()) {
              exerciseWeekContent = weekContent.weight.trim();
              break;
            }
          }
        }
      }

      let line = exercise.name;
      if (exerciseWeekContent) line += ` - ${exerciseWeekContent}`;
      
      const info = [];
      if (rpeValues.length > 0) info.push(`RPE ${rpeValues.join(', ')}`);
      if (info.length > 0) line += ` (${info.join(' | ')})`;
      
      return line;
    }).join('\n\n');
  }, [exercisesWithData, videos]);

  // Inizializza il testo modificabile se non è già stato impostato
  React.useEffect(() => {
    if (!editableText) {
      setEditableText(generateSummaryText);
    }
  }, [generateSummaryText, editableText]);

  const handleSaveText = () => {
    setIsEditingText(false);
  };

  const handleCancelEdit = () => {
    setEditableText(generateSummaryText);
    setIsEditingText(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 max-w-4xl text-center">
        <p className="text-muted-foreground">Sessione non trovata. Inizia un nuovo allenamento.</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Nuovo Allenamento
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Allenamento Completato!</h1>
        <p className="text-muted-foreground">
          Ecco il riepilogo del tuo allenamento
        </p>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Statistiche Allenamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Giorno:</span>
              <span className="font-medium">{session?.selectedDay}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Esercizi totali:</span>
              <span className="font-medium">{totalExercises}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Video caricati:</span>
              <span className="font-medium">{videos.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Media RPE allenamento:</span>
              <span className="font-medium">{averageRPE}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completamento:</span>
              <span className="font-medium text-green-600">{completionPercentage}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {exercisesWithData.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Riepilogo Esercizi</CardTitle>
              <Button
                onClick={() => setIsEditingText(!isEditingText)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Modifica Testo</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingText ? (
              <div className="space-y-4">
                <Textarea
                  value={editableText}
                  onChange={(e) => setEditableText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Modifica il testo del riepilogo..."
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleSaveText}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Salva</span>
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Annulla</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="whitespace-pre-wrap text-sm p-4 bg-muted/30 rounded-lg">
                  {editableText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <ShareButton 
          exercises={sessionExercises}
          videos={videos}
          selectedDay={session.selectedDay}
          customSummaryText={editableText}
        />
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/edit-workout')}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Modifica Ancora
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
        >
          Nuovo Allenamento
        </Button>
      </div>
    </div>
  );
}