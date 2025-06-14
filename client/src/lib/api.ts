export async function uploadPDF(file: File) {
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await fetch('/api/upload-pdf', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Errore durante il caricamento del PDF');
  }

  return response.json();
}

export async function selectDay(sessionId: number, dayId: string, exercises: any[]) {
  const response = await fetch('/api/select-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, dayId, exercises }),
  });

  if (!response.ok) {
    throw new Error('Errore nella selezione del giorno');
  }

  return response.json();
}

export async function uploadVideo(sessionId: number, exerciseId: string, weekId: string, file: File) {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('sessionId', sessionId.toString());
  formData.append('exerciseId', exerciseId);
  formData.append('weekId', weekId);

  const response = await fetch('/api/upload-video', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Errore durante il caricamento del video');
  }

  return response.json();
}

export async function updateExercise(sessionId: number, exerciseId: string, weekId: string, data: { rpe?: number; notes?: string }) {
  const response = await fetch('/api/update-exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, exerciseId, weekId, ...data }),
  });

  if (!response.ok) {
    throw new Error('Errore nell\'aggiornamento dell\'esercizio');
  }

  return response.json();
}

export async function getCurrentSession() {
  const response = await fetch('/api/current-session');
  
  if (!response.ok) {
    throw new Error('Errore nel recupero della sessione');
  }

  return response.json();
}

export async function restartApp() {
  const response = await fetch('/api/restart', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Errore nel riavvio dell\'applicazione');
  }

  return response.json();
}

export async function sendToTelegram() {
  const response = await fetch('/api/send-to-telegram', {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Errore nell\'invio su Telegram');
  }

  return response.json();
}
