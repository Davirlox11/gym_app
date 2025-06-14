import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, Edit3 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExerciseTable } from '@/components/exercise-table';

export function EditWorkoutPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = React.useState(false);

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

  const handleVideoUpload = async (exerciseId: string, weekId: string, file: File) => {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('sessionId', session?.id?.toString() || '');
    formData.append('exerciseId', exerciseId);
    formData.append('weekId', weekId);

    const response = await fetch('/api/upload-video', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Errore durante il caricamento del video');
    }

    queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    return response.json();
  };

  const rpeUpdateMutation = useMutation({
    mutationFn: async ({ exerciseId, weekId, rpe }: { exerciseId: string; weekId: string; rpe: number }) => {
      const response = await fetch('/api/update-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id,
          exerciseId,
          weekId,
          rpe
        })
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'aggiornamento RPE');
      }

      return response.json();
    },
    onSuccess: () => {
      // Forza il refresh completo dei dati
      queryClient.invalidateQueries({ queryKey: ['/api/current-session'] });
      queryClient.refetchQueries({ queryKey: ['/api/current-session'] });
    }
  });

  const handleRPEChange = (exerciseId: string, weekId: string, rpe: number) => {
    rpeUpdateMutation.mutate({ exerciseId, weekId, rpe });
  };

  const notesUpdateMutation = useMutation({
    mutationFn: async ({ exerciseId, notes }: { exerciseId: string; notes: string }) => {
      const response = await fetch('/api/update-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id,
          exerciseId,
          notes
        })
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'aggiornamento note');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/current-session'] });
    }
  });

  const handleNotesChange = (exerciseId: string, notes: string) => {
    notesUpdateMutation.mutate({ exerciseId, notes });
  };

  const handleVideoRemove = async (videoId: number) => {
    const response = await fetch(`/api/videos/${videoId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Errore durante la rimozione del video');
    }

    queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
  };

  const handleCompleteWorkout = () => {
    navigate('/summary');
  };

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4 mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium">Caricamento allenamento...</p>
        </div>
      </div>
    );
  }

  if (!session?.selectedDay) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mb-6 mx-auto">
            <Edit3 className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Nessun giorno selezionato</h2>
          <p className="text-muted-foreground mb-6">Seleziona prima un giorno di allenamento</p>
          <Button onClick={() => navigate('/select-day')} className="gradient-primary text-white px-8 py-3">
            Seleziona Giorno
          </Button>
        </div>
      </div>
    );
  }

  const selectedPage = session?.workoutData?.pages?.find(
    (p: any) => `day-${p.pageNumber}` === session.selectedDay
  );

  if (!selectedPage) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6 mx-auto">
            <Edit3 className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Errore nel caricamento</h2>
          <p className="text-muted-foreground mb-6">Impossibile trovare il giorno selezionato</p>
          <Button onClick={() => navigate('/select-day')} className="gradient-primary text-white px-8 py-3">
            Torna alla Selezione
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                <Edit3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {selectedPage.title}
                </h1>
                <p className="text-muted-foreground text-lg">
                  Completa il tuo allenamento con video e valutazioni
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/select-day')}
              className="px-6 py-3 hover:shadow-medium transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cambia giorno
            </Button>
          </div>

          {/* Session Info Card */}
          <Card className="shadow-medium border-0 mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                    <Check className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Sessione attiva</h3>
                    <p className="text-sm text-muted-foreground">{session.pdfFilename}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  {selectedPage.exercises?.length || 0} esercizi da completare
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exercise Table */}
        <div className="animate-slide-up">
          <ExerciseTable
            exercises={selectedPage.exercises || []}
            selectedDay={session.selectedDay}
            videos={videos}
            onVideoUpload={handleVideoUpload}
            onRPEChange={handleRPEChange}
            onNotesChange={handleNotesChange}
            onVideoRemove={handleVideoRemove}
            isEditing={isEditing}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-12 animate-fade-in">
          <Card className="shadow-large border-0 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold mb-2">Completamento Allenamento</h3>
                <p className="text-muted-foreground">
                  Aggiungi video, valutazioni RPE e note prima di terminare
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <Button 
                  onClick={handleToggleEdit}
                  variant={isEditing ? "outline" : "default"}
                  className={`px-8 py-4 text-lg font-medium transition-all duration-200 ${
                    isEditing 
                      ? 'hover:shadow-medium' 
                      : 'gradient-secondary hover:shadow-medium text-white border-0'
                  }`}
                >
                  <Edit3 className="h-5 w-5 mr-2" />
                  {isEditing ? "Termina Modifica" : "Modifica Dettagli"}
                </Button>
                <Button 
                  onClick={handleCompleteWorkout}
                  className="gradient-primary hover:shadow-medium transition-all duration-200 text-white border-0 px-12 py-4 text-lg font-medium"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Completa Allenamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}