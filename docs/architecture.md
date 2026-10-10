# Adaptive AI Mock Interview System — Architecture Documentation

## 1. System Overview
The **Adaptive AI Mock Interview System** is an end-to-end full-stack web application designed for students and working software professionals to conduct realistic, audio-visual technical interviews. 

The system relies on an **Orchestrator Architecture** with a strict rule: **AI Agents never call each other directly**. All agent coordination, state transitions, speech processing, and database persistence are controlled exclusively by the **Central Interview Orchestrator**.

---

## 2. Component Taxonomy

### Frontend (`frontend/src`)
* **Vite + React (TypeScript):** High-performance Single Page Application (SPA).
* **Tailwind CSS:** Modern, responsive dark-navy theme.
* **Web Media APIs:** `navigator.mediaDevices.getUserMedia` for webcam/microphone preview and `MediaRecorder` for audio chunk capture.
* **Speech Synthesis API:** Native browser `window.speechSynthesis` for vocal question playback.
* **Recharts:** Interactive bar and line charts for 5-dimension performance analysis and improvement tracking.

### Backend (`backend/app`)
* **Modular Monolith (FastAPI + Async SQLAlchemy):** High throughput, async request processing, and clear modular separation.
* **Database Layer:** 14 relational tables with SQLite asynchronous engine (`aiosqlite`) for local development and PostgreSQL (`asyncpg`) for production.
* **Authentication & Profile Module:** JWT Bearer tokens with bcrypt password hashing and candidate profile management.
* **Speech-to-Text Module:** Handles audio payloads, payload size verification, and speech-to-text conversion (Whisper API / fallback).
* **Resume Analysis Agent:** Extracts structured text from PDF and DOCX documents using PyMuPDF and python-docx, detecting skills, projects, and job matches.
* **Interview Planner Agent:** Generates non-repetitive, personalized question plans spanning technical, behavioral, situational, and HR rounds.
* **Interviewer Agent:** Handles speech delivery, conversational round transitions, follow-up probes, and clarification explanations.
* **Trained NLP Voice-Interaction Agent:** Transformer-based classifier (`nlp_service`) for candidate intent classification, semantic relevance scoring, concept detection, and audio reliability flagging.
* **Answer Evaluation Agent:** Strictly evaluates spoken candidate responses on a documented 5-dimension rubric (0–5 integer scores) backed by exact transcript evidence quotes.
* **Feedback & Coaching Agent:** Synthesizes category-wise averages, extracts evidence-based strengths/weaknesses, and generates downloadable PDF reports using ReportLab.
* **Central Interview Orchestrator:** The deterministic state controller that advances turns, controls difficulty adaptation (+/- 1 level), and enforces follow-up limits (max 2 per parent question).

---

## 3. Interview Turn State Machine

```
Candidate Spoken Answer
        │
        ▼
Speech-to-Text (Acoustic Transcription)
        │
   [Reliable?] ─── No ───► Repeat / Type Prompt (No score penalty)
        │ Yes
        ▼
Trained NLP Agent (Intent, Relevance, Concept Match)
        │
   [Intent?]
   ├─► Repeat Request ──────► Replay current question without penalty
   ├─► Clarify Request ─────► Explain question scope without counting as answer
   ├─► Skip Request ────────► Record skip, advance without zero score
   └─► Answer
         │
         ▼
   Answer Evaluation Agent (5-Dimension Rubric + Evidence Quotes)
         │
   [Orchestrator Decision Rules]
   ├─ Completeness <= 2 & follow-ups < 2 ──► Issue follow-up probe
   ├─ Score >= 4.0 & no missing concepts ──► Increase difficulty (+1, max 5)
   ├─ Score <= 2.0 ────────────────────────► Decrease difficulty (-1, min 1)
   └─ Otherwise ───────────────────────────► Advance at current difficulty
```
