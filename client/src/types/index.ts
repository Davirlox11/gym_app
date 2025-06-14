export interface Exercise {
  id: string;
  name: string;
  setsReps: string;
  weeks: {
    [weekId: string]: {
      weight?: string;
      video?: {
        id: string;
        filename: string;
        originalName: string;
      };
      rpe?: number;
    };
  };
  notes?: string;
  scarico?: string;
  recupero?: string;
  note?: string;
}

export interface WorkoutDay {
  id: string;
  name: string;
  description?: string;
  exercises: Exercise[];
}

export interface PDFPage {
  pageNumber: number;
  title: string;
  description?: string;
  exercises: Exercise[];
}

export interface WorkoutSession {
  id: number;
  pdfFilename: string;
  selectedDay?: string;
  exercises: Exercise[];
  createdAt: string;
}

export interface VideoUpload {
  id: number;
  sessionId: number;
  exerciseId: string;
  weekId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export type UploadState = 'idle' | 'uploading' | 'success' | 'error';
export type SendState = 'idle' | 'sending' | 'success' | 'error';
