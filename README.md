# CoachSheet - Gestione Schede di Allenamento

CoachSheet è un'applicazione web full-stack per la gestione delle schede di allenamento. Permette di caricare PDF con tabelle di esercizi, aggiungere video e valutazioni RPE, e inviare riepiloghi al coach tramite Telegram.

## Funzionalità Principali

- 📄 **Caricamento PDF**: Upload e parsing automatico di schede di allenamento in formato PDF
- 📅 **Selezione Giorno**: Supporto per PDF multi-pagina con selezione del giorno di allenamento
- 📊 **Tabella Esercizi**: Interfaccia Excel-like per la modifica degli esercizi
- 🎥 **Upload Video**: Caricamento video per ogni esercizio (.mp4, .mov, etc.)
- ⭐ **Valutazione RPE**: Scala 1-10 per ogni esercizio
- 📱 **Invio Telegram**: Invio automatico del riepilogo al coach
- 🔄 **Reset Completo**: Funzione "Ricomincia" per nuove sessioni

## Stack Tecnologico

### Frontend
- React 18 + Vite
- TypeScript
- Tailwind CSS + shadcn/ui
- React Query (TanStack Query)
- Wouter (routing)

### Backend
- FastAPI (Python)
- pdfplumber + camelot (parsing PDF)
- python-telegram-bot (integrazione Telegram)
- python-magic (validazione file)
- Memoria locale per storage

## Setup e Installazione

### 1. Installazione Dipendenze Python

```bash
pip install -r requirements.txt
