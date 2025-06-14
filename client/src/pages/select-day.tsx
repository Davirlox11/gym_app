import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function SelectDayPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/current-session'],
    queryFn: async () => {
      const response = await fetch('/api/current-session');
      if (!response.ok) throw new Error('Failed to fetch session');
      const data = await response.json();
      return data.session;
    }
  });

  const selectDayMutation = useMutation({
    mutationFn: async (dayId: string) => {
      const pageNumber = parseInt(dayId.split('-')[1]);
      const selectedPage = session?.workoutData?.pages?.find((p: any) => p.pageNumber === pageNumber);
      
      const response = await fetch('/api/select-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session?.id,
          dayId,
          exercisesCount: selectedPage?.exercises?.length || 0
        })
      });
      
      if (!response.ok) throw new Error('Errore selezione giorno');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/current-session'] });
      navigate('/edit-workout');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4 mx-auto">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-lg font-medium">Caricamento scheda...</p>
        </div>
      </div>
    );
  }

  if (!session?.workoutData?.pages) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6 mx-auto">
            <FileText className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Nessuna scheda trovata</h2>
          <p className="text-muted-foreground mb-6">Carica un PDF per iniziare</p>
          <Button onClick={() => navigate('/')} className="gradient-primary text-white px-8 py-3">
            Carica PDF
          </Button>
        </div>
      </div>
    );
  }

  const handleDaySelect = (pageNumber: number) => {
    const dayId = `day-${pageNumber}`;
    selectDayMutation.mutate(dayId);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary shadow-large mb-6">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Seleziona il tuo giorno
          </h1>
          <p className="text-xl text-muted-foreground">
            Scegli il giorno di allenamento che vuoi modificare
          </p>
        </div>

        {/* PDF Info Card */}
        <Card className="mb-8 shadow-medium border-0 animate-slide-up">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Scheda caricata</h3>
                <p className="text-muted-foreground">{session.pdfFilename}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-slide-up">
          {session.workoutData.pages.map((page: any, index: number) => (
            <Card 
              key={page.pageNumber} 
              className="group hover:shadow-large transition-all duration-300 cursor-pointer border-0 shadow-medium hover:scale-[1.02] animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleDaySelect(page.pageNumber)}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Day Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {page.title}
                      </h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Exercises Count */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">{page.exercises.length}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {page.exercises.length === 1 ? 'esercizio' : 'esercizi'}
                    </span>
                  </div>

                  {/* Description */}
                  {page.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {page.description}
                    </p>
                  )}

                  {/* Action Button */}
                  <Button 
                    className="w-full gradient-primary hover:shadow-medium transition-all duration-200 text-white border-0" 
                    disabled={selectDayMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDaySelect(page.pageNumber);
                    }}
                  >
                    {selectDayMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Caricamento...
                      </div>
                    ) : (
                      'Inizia allenamento'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Action */}
        <div className="mt-12 text-center animate-fade-in">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="px-8 py-3 text-lg hover:shadow-medium transition-all duration-200"
          >
            Carica nuova scheda PDF
          </Button>
        </div>
      </div>
    </div>
  );
}