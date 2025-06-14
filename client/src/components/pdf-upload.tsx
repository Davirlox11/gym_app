import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadState } from '../types';

interface PDFUploadProps {
  uploadState: UploadState;
  uploadProgress: number;
  fileName?: string;
  onFileUpload: (file: File) => void;
}

export function PDFUpload({ uploadState, uploadProgress, fileName, onFileUpload }: PDFUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Check if it's a PDF by file extension or MIME type
      const isPDF = file.type === 'application/pdf' || 
                   file.name.toLowerCase().endsWith('.pdf') ||
                   file.type === '' && file.name.toLowerCase().endsWith('.pdf');
      
      if (isPDF) {
        if (file.size > 5 * 1024 * 1024) {
          alert('Il file PDF deve essere inferiore a 5MB');
          return;
        }
        onFileUpload(file);
      } else {
        alert('Seleziona un file PDF valido');
      }
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], rejectedFiles: any[]) => {
      console.log('Files dropped:', { acceptedFiles, rejectedFiles });
      onDrop(acceptedFiles);
    },
    multiple: false,
    disabled: uploadState === 'uploading',
    noClick: false,
    noKeyboard: false,
    onDropRejected: (rejectedFiles) => {
      console.log('Files rejected:', rejectedFiles);
    }
  });

  return (
    <div className="mb-8">
      <Card className="overflow-hidden">
        <div className="px-6 py-4 bg-muted/50 border-b">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
              <span className="text-primary-foreground text-sm font-medium">1</span>
            </div>
            <h2 className="text-lg font-medium">Carica Scheda PDF</h2>
          </div>
        </div>
        
        <CardContent className="p-6">
          {uploadState === 'success' ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">PDF caricato con successo</p>
                  <p className="text-xs text-green-600">{fileName}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'}
                  ${uploadState === 'uploading' ? 'pointer-events-none opacity-50' : ''}
                `}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-base font-medium mb-1">
                      {isDragActive ? 'Rilascia il file qui' : 'Trascina il file PDF qui'}
                    </p>
                    <p className="text-sm text-muted-foreground">oppure clicca per selezionare (max 5MB)</p>
                  </div>
                  {uploadState !== 'uploading' && (
                    <Button type="button">
                      <FileText className="h-4 w-4 mr-2" />
                      Seleziona File
                    </Button>
                  )}
                </div>
              </div>

              {uploadState === 'uploading' && (
                <div className="mt-4">
                  <div className="bg-primary/5 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      <span className="text-sm text-primary font-medium">Elaborazione PDF in corso...</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                </div>
              )}

              {uploadState === 'error' && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Errore durante l'elaborazione del PDF</p>
                      <p className="text-xs text-red-600">Riprova con un file PDF diverso</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
