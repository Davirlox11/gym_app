import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Database, HardDrive } from 'lucide-react';

export function DBTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<any>(null);

  const getStorageStatus = async () => {
    try {
      const response = await fetch('/api/storage-status');
      const data = await response.json();
      setStorageStatus(data);
    } catch (err) {
      console.error('Failed to get storage status:', err);
    }
  };

  useEffect(() => {
    getStorageStatus();
  }, []);

  const migrateToDatabase = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/migrate-to-db', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setResult(data);
        await getStorageStatus(); // Refresh storage status
      } else {
        setResult(data); // Store full response data for detailed error info
        setError(data.details || data.error || 'Unknown error');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Migrazione a Database Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            L'app attualmente usa storage temporaneo. Configura Supabase per salvare i dati permanentemente.
          </div>

          {storageStatus && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {storageStatus.type === 'DatabaseStorage' ? (
                  <Database className="h-5 w-5 text-green-600" />
                ) : (
                  <HardDrive className="h-5 w-5 text-orange-600" />
                )}
                <div>
                  <p className="text-sm font-medium">{storageStatus.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Tipo storage: {storageStatus.type}
                  </p>
                </div>
              </div>
              
              {storageStatus.hasDatabaseUrl && storageStatus.type === 'MemStorage' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <XCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        DATABASE_URL configurato ma formato errato
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Hai copiato l'URL del progetto Supabase (https://...) invece della stringa di connessione PostgreSQL. 
                        Serve l'URL che inizia con "postgresql://postgres...."
                      </p>
                      <div className="mt-2 text-xs text-yellow-700">
                        <p className="font-medium">Come ottenere l'URL corretto:</p>
                        <ol className="list-decimal list-inside ml-2 mt-1 space-y-0.5">
                          <li>Vai nel tuo progetto Supabase</li>
                          <li>Clicca "Connect" in alto</li>
                          <li>Vai su "Connection string" → "Transaction pooler"</li>
                          <li>Copia l'URI PostgreSQL (NON l'URL del progetto)</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button 
            onClick={migrateToDatabase} 
            disabled={isLoading || storageStatus?.type === 'DatabaseStorage'}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : storageStatus?.type === 'DatabaseStorage' ? (
              'Database già configurato'
            ) : (
              'Migra a Database PostgreSQL'
            )}
          </Button>

          {result && result.success && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Migrazione completata!</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">{result.message}</p>
                {result.needsRestart && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800 font-medium">
                      Riavvia l'applicazione per utilizzare il database PostgreSQL
                    </p>
                  </div>
                )}
                {result.diagnostics && (
                  <div className="mt-3 text-xs text-green-600">
                    <p className="font-medium">Diagnostica connessione:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Hostname: {result.diagnostics.hostname}</li>
                      <li>Porta: {result.diagnostics.port}</li>
                      <li>Database: {result.diagnostics.database}</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Errore di connessione</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">Dettagli errore:</p>
                <p className="text-sm text-red-700 mb-3">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
                
                {result?.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-red-800 mb-2">Suggerimenti per risolvere:</p>
                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                      {result.suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-red-200">
                  <p className="text-xs font-medium text-red-800 mb-2">Controlli da fare:</p>
                  <div className="text-xs text-red-700 space-y-2">
                    <div>
                      <strong>1. Verifica DATABASE_URL in Supabase:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Vai su supabase.com → il tuo progetto</li>
                        <li>Clicca "Connect" → "Connection string" → "Transaction pooler"</li>
                        <li>Copia l'URL e sostituisci [YOUR-PASSWORD] con la tua password</li>
                        <li>Dovrebbe iniziare con "postgresql://postgres.xxxxx:"</li>
                      </ul>
                    </div>
                    <div>
                      <strong>2. Verifica configurazione progetto:</strong>
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>Il progetto Supabase deve essere attivo (non in pausa)</li>
                        <li>Controlla che non ci siano problemi di rete</li>
                        <li>La password deve essere quella corretta del database</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-2">Informazioni sulla configurazione:</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• L'app attualmente usa storage temporaneo che perde i dati al riavvio</p>
              <p>• Dopo la migrazione, tutti i dati vengono salvati permanentemente in PostgreSQL</p>
              <p>• Il database viene inizializzato automaticamente durante la migrazione</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}