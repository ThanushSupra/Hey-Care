# HeyCare

Voice-first medical documentation assistant that captures doctor–patient conversations, extracts structured patient information with AI, and saves everything as searchable notes — minimizing tapping, swiping, or scrolling.

## What This Is & Why
- Problem: Clinical documentation is time-consuming and distracts from patient care.
- Solution: HeyCare records the conversation, transcribes it, and uses AI to auto‑populate key fields (patient details, symptoms, history, diagnosis, treatment, vitals, etc). Clinicians can review, edit, and save in seconds.

## How It Was Built
- Frontend: React + TypeScript + Vite.
- UI: Tailwind CSS + shadcn/ui
- Voice: Web Speech API for in‑browser speech recognition and live transcription.
- Data: Supabase for storing patient records and notes.
- AI: Supabase Edge Function (`analyze-transcript`) calls OpenRouter (model: `gpt-4o-mini`) to extract structured fields and a speaker‑labeled transcript.

Applicaiton flow:
1) Start recording. Live transcript updates in real time.
2) On pause/stop, the transcript is sent to the Edge Function.
3) The model returns structured fields which pre‑fill the Patient form.
4) Save to Supabase, search notes, and export as text/HTML.

## Build & Run (Local)
Prerequisites:
- Node.js 18+ and npm
- A modern Chromium/WebKit browser (Chrome, Edge, Safari) for the Web Speech API

Steps:
1) Install dependencies
   - `npm install`
2) Start the dev server
   - `npm run dev`
   - Open the printed localhost URL
3) Allow microphone access in the browser when prompted

Production build:
- Build: `npm run build`
- Preview locally: `npm run preview` (serves the built files)

Notes:
- The Web Speech API is not supported in all browsers (notably some versions of Firefox). Use Chrome, Edge, or Safari.

## Who Built This
- Thanush
- Het
- Vansh
- Issac
- Parth
