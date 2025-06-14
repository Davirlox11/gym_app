import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function UploadPage() {
  const [, navigate] = useLocation();
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Errore durante il caricamento del PDF');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/current-session'] });
      navigate('/select-day');
    },
    onError: (error) => {
      console.error('Errore caricamento:', error);
      alert('Errore durante il caricamento del PDF');
      setUploadingFile(null);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      alert('Seleziona un file PDF valido');
      return;
    }

    setUploadingFile(file);
    uploadMutation.mutate(file);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    
    if (!file) return;
    
    if (!file.type.includes('pdf')) {
      alert('Seleziona un file PDF valido');
      return;
    }

    setUploadingFile(file);
    uploadMutation.mutate(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-primary shadow-large mb-6">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            CoachSheet
          </h1>
          <p className="text-xl text-muted-foreground">
            Trasforma la tua scheda PDF in un'esperienza digitale interattiva
          </p>
        </div>

        {/* Upload Card */}
        <Card className="shadow-large border-0 animate-slide-up">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold">
              Carica la tua scheda PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 cursor-pointer ${
                uploadMutation.isPending 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-300 hover:border-primary hover:bg-primary/5'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => !uploadMutation.isPending && document.getElementById('pdf-input')?.click()}
            >
              <input
                id="pdf-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploadMutation.isPending}
              />
              
              {uploadMutation.isPending ? (
                <div className="flex flex-col items-center animate-scale-in">
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-6">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                  <p className="text-xl font-semibold mb-2">Processando il PDF...</p>
                  <p className="text-sm text-muted-foreground">
                    Analizzando esercizi e struttura della scheda
                  </p>
                  {uploadingFile && (
                    <div className="mt-4 px-4 py-2 bg-white/80 rounded-lg shadow-soft">
                      <p className="text-sm font-medium">{uploadingFile.name}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-6">
                    <Upload className="h-10 w-10 text-purple-600" />
                  </div>
                  <p className="text-xl font-semibold mb-2">Trascina qui il tuo PDF</p>
                  <p className="text-muted-foreground mb-6">
                    oppure clicca per selezionare dal tuo dispositivo
                  </p>
                  <Button className="gradient-primary hover:shadow-medium transition-all duration-200 text-white border-0 px-8 py-3 text-lg font-medium">
                    Seleziona file PDF
                  </Button>
                </div>
              )}
            </div>
            
            {uploadMutation.isError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl animate-slide-up">
                <p className="text-red-600 font-medium">
                  ⚠️ Errore durante il caricamento. Verifica che il file sia un PDF valido e riprova.
                </p>
              </div>
            )}
            
            {/* Info section */}
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-3">✨ Cosa succede dopo il caricamento:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  Analizziamo automaticamente la struttura della tua scheda
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  Estraiamo esercizi, serie e ripetizioni
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                  Potrai aggiungere video, RPE e note per ogni esercizio
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}