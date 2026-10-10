# Adaptive AI Mock Interview System

A complete full-stack web application for conducting realistic, AI-powered mock interviews through real-time audio and webcam video feeds. Features resume parsing, dynamic question planning, a trained NLP voice-interaction agent, deterministic adaptive difficulty scaling, evidence-based rubric scoring, and downloadable PDF performance reports.

---

## 🚀 Key Features

* **Resume Analysis Agent:** Extracts skills, projects, and work experience from PDF and DOCX documents (up to 5 MB), calculating real job-match scores.
* **Interview Planner Agent:** Generates tailored, non-repetitive interview plans across Technical, Behavioral, Situational, and HR rounds.
* **Trained NLP Voice-Interaction Agent:** Transformer-based classifier that decodes candidate intent (`answer`, `repeat_request`, `clarification_request`, `skip_request`) and checks expected-concept coverage.
* **Central Interview Orchestrator:** Enforces adaptive interview rules:
  * Adjusts question difficulty up or down (Level 1 to 5) based on answer quality.
  * Triggers context-aware follow-up probes (max 2 per parent question) when completeness is low.
  * Handles poor audio or repeat requests with zero penalty.
* **Answer Evaluation Agent:** Scores answers across 5 dimensions (Technical Correctness, Relevance, Completeness, Problem Solving, Communication Clarity) backed by direct transcript quotes.
* **Live Video Interview Room:** In-browser webcam preview, speech recognition audio capture via `MediaRecorder`, and spoken questions via the browser `SpeechSynthesis` API.
* **Auditable Performance Reports:** Visual Recharts dashboard, category breakdowns, and downloadable PDF reports generated with ReportLab.
* **Practice & Coaching Lab:** Retry weak questions to track side-by-side improvement without overwriting original interview records.
* **Privacy & User Rights:** Explicit media consent checks, encrypted local media storage, and a user-controlled "Erase All My Data" deletion workflow.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React, Axios, React Router |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), SQLite / PostgreSQL, Pydantic v2 |
| **Document Processing**| PyMuPDF (fitz), python-docx |
| **NLP & AI Pipeline** | PyTorch, Hugging Face Transformers (DistilBERT), Scikit-Learn, OpenAI / Whisper |
| **Reporting & Media** | ReportLab, Web Audio API, Web SpeechSynthesis API |

---

## 📋 Project Structure

```text
adaptive-ai-mock-interview/
├── backend/
│   ├── app/
│   │   ├── agents/          # Resume, Planner, Interviewer, Evaluator, Coach
│   │   ├── api/v1/          # REST endpoints (auth, resumes, interviews, reports, etc.)
│   │   ├── core/            # Config, security (JWT, bcrypt)
│   │   ├── db/              # Async SQLAlchemy engine & sessions
│   │   ├── models/          # 14 SQLAlchemy relational models
│   │   ├── orchestrator/    # Central state controller
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Audio ingestion & Whisper STT
│   │   └── main.py          # FastAPI application entrypoint
│   ├── nlp_service/         # NLP model training, dataset generation, inference
│   ├── tests/               # Pytest suite
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar, video previews, visualizers
│   │   ├── context/         # AuthContext
│   │   ├── pages/           # Landing, Dashboard, Setup, Room, Results, etc.
│   │   ├── services/        # Typed API client
│   │   ├── types/           # TypeScript definitions
│   │   └── App.tsx          # Protected routes & application root
│   ├── package.json
│   └── vite.config.ts
├── docs/                    # Architecture, API contract, and NLP model cards
├── docker-compose.yml
└── README.md
```

---

## ⚙️ Local Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Activate your Python 3.11 virtual environment:
   * **Windows (PowerShell):**
     ```powershell
     .venv\Scripts\activate
     ```
   * **macOS / Linux:**
     ```bash
     source .venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Generate the training dataset and train the baseline NLP model:
   ```bash
   python nlp_service/dataset_generator.py
   python nlp_service/train.py
   ```
5. (Optional) Configure environment variables:
   * Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   * Add your `OPENAI_API_KEY` for GPT-4o-mini and Whisper transcription (system runs in reliable offline-calibrated fallback mode if omitted).
6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * Swagger Documentation is available at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend Setup
1. In a separate terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web application at: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Automated Tests

Run backend tests using `pytest`:
```bash
cd backend
.venv\Scripts\python -m pytest tests/ -v
```

Test frontend TypeScript compilation and production build:
```bash
cd frontend
npm run build
```

---

## 🎯 Verification & Definition of Done

1. **Authentication:** Register and log in with JWT tokens.
2. **Resume Analysis:** Upload PDF or DOCX resumes; view extracted skills and projects.
3. **Interview Planning:** Configure rounds, difficulty, and question count; review tailored plan.
4. **Device Check:** Check webcam preview and microphone volume visualizer with explicit consent.
5. **Live Interview:** Listen to spoken questions (TTS) and record answers (MediaRecorder).
6. **Adaptive Orchestration:** Experience intent classification (answer, repeat, clarify, skip) and adaptive follow-up prompts.
7. **Evidence-Based Reports:** Inspect 5-dimension scores, missing concepts, transcript quotes, and download the PDF report.
8. **Practice Lab:** Re-attempt specific weak questions and inspect comparative score improvements.
9. **Privacy:** Delete sessions or wipe all data via the History page.
