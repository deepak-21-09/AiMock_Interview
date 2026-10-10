# API Specification — Adaptive AI Mock Interview System

Base URL: `/api/v1`

## 1. Authentication & Profile
* `POST /auth/register` — Register a new candidate account.
* `POST /auth/login` — Login and receive a JWT Bearer token.
* `GET /auth/me` — Retrieve authenticated user details.
* `GET /auth/profile` — Retrieve candidate profile.
* `PUT /auth/profile` — Update candidate profile (target role, experience, bio).

## 2. Resumes
* `POST /resumes/upload` — Multipart upload (`.pdf`, `.docx`, max 5MB). Runs Resume Analysis Agent.
* `GET /resumes` — List candidate's uploaded resumes.
* `GET /resumes/{resume_id}` — View structured parsed skills, projects, and job match details.
* `PUT /resumes/{resume_id}/skills` — Correct or manually append skills.
* `DELETE /resumes/{resume_id}` — Delete resume and clean up storage.

## 3. Interview Planning & Execution
* `POST /interviews/plan` — Generate personalized interview plan using Interview Planner Agent.
* `GET /interviews` — List interview sessions for user.
* `GET /interviews/{session_id}` — Get active interview session status and current question.
* `POST /interviews/{session_id}/start` — Record device consent and activate interview.
* `POST /interviews/{session_id}/answer` — Submit audio payload (base64) or text answer. Orchestrates transcription, NLP intent analysis, answer evaluation, and next turn action.
* `POST /interviews/{session_id}/repeat` — Repeat current question without advancing or penalty.
* `POST /interviews/{session_id}/clarify` — Request question clarification without penalty.
* `POST /interviews/{session_id}/skip` — Skip current question without zero score penalty.
* `POST /interviews/{session_id}/end` — Conclude interview session early and generate final report.

## 4. Reports & Performance
* `GET /interviews/{session_id}/report` — Retrieve overall score, 5-dimension averages, per-question analysis with evidence quotes and missing concepts.
* `GET /interviews/{session_id}/report/pdf` — Download generated PDF report.

## 5. Practice & Coaching Lab
* `POST /practice/{question_id}/retry` — Submit revised answer for an evaluated question.
* `GET /practice/{attempt_id}/comparison` — Side-by-side comparison of original vs revised scores across all 5 dimensions.

## 6. History & Privacy
* `GET /history` — Summary of all completed sessions and audit logs.
* `DELETE /history/interviews/{session_id}` — Delete a specific session and associated audio/reports.
* `DELETE /history/account/data` — User-controlled data erasure (removes all resumes, answers, and reports).

## 7. Internal Services & Health
* `POST /internal/nlp/analyze` — Internal inference endpoint for Trained NLP Voice Agent.
* `GET /health` — Application health check.
