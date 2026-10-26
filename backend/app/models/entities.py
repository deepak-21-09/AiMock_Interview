import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, JSON, DateTime, ForeignKey
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def gen_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    profile = relationship("CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")
    practice_attempts = relationship("PracticeAttempt", back_populates="user", cascade="all, delete-orphan")
    consent_records = relationship("ConsentRecord", back_populates="user", cascade="all, delete-orphan")
    proctoring_events = relationship("ProctoringEvent", back_populates="user", cascade="all, delete-orphan")

class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=True)
    education = Column(String(255), nullable=True)
    years_of_experience = Column(Float, default=0.0)
    current_role = Column(String(255), nullable=True)
    target_role = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="profile")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    raw_text = Column(Text, nullable=True)
    parsed_skills = Column(JSON, default=list)
    parsed_projects = Column(JSON, default=list)
    parsed_experience = Column(JSON, default=list)
    parsed_education = Column(JSON, default=list)
    job_match = Column(JSON, default=dict)
    confidence_score = Column(Float, default=1.0)
    is_scanned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="resumes")
    sessions = relationship("InterviewSession", back_populates="resume")

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(String(36), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    target_role = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=True)
    status = Column(String(32), default="draft")  # draft, active, paused, completed, abandoned
    starting_difficulty = Column(Integer, default=3)
    current_difficulty = Column(Integer, default=3)
    target_rounds = Column(JSON, default=list)  # ["technical", "hr", "behavioral", "situational"]
    total_planned_questions = Column(Integer, default=5)
    duration_minutes = Column(Integer, default=30)
    interaction_mode = Column(String(32), default="voice")  # voice, text
    overall_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="sessions")
    resume = relationship("Resume", back_populates="sessions")
    rounds = relationship("InterviewRound", back_populates="session", cascade="all, delete-orphan", order_by="InterviewRound.round_order")
    questions = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan", order_by="InterviewQuestion.order_index")
    report = relationship("InterviewReport", back_populates="session", uselist=False, cascade="all, delete-orphan")
    consent_record = relationship("ConsentRecord", back_populates="session", uselist=False)
    proctoring_events = relationship("ProctoringEvent", back_populates="session", cascade="all, delete-orphan")

class InterviewRound(Base):
    __tablename__ = "interview_rounds"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    round_type = Column(String(64), nullable=False)  # technical, hr, behavioral, situational
    round_order = Column(Integer, nullable=False, default=1)
    status = Column(String(32), default="pending")  # pending, in_progress, completed

    session = relationship("InterviewSession", back_populates="rounds")
    questions = relationship("InterviewQuestion", back_populates="round", cascade="all, delete-orphan")

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    round_id = Column(String(36), ForeignKey("interview_rounds.id", ondelete="CASCADE"), nullable=True)
    parent_question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="SET NULL"), nullable=True)
    question_text = Column(Text, nullable=False)
    difficulty = Column(Integer, default=3)  # 1 to 5
    competency_focus = Column(Text, nullable=True)
    expected_concepts = Column(JSON, default=list)
    source_reference = Column(String(255), nullable=True)  # e.g., "Project: ML Classifier", "JD: Distributed Systems"
    order_index = Column(Integer, default=1)
    is_followup = Column(Boolean, default=False)
    follow_up_count = Column(Integer, default=0)
    status = Column(String(32), default="pending")  # pending, asked, answered, skipped
    created_at = Column(DateTime(timezone=True), default=utc_now)

    session = relationship("InterviewSession", back_populates="questions")
    round = relationship("InterviewRound", back_populates="questions")
    answers = relationship("InterviewAnswer", back_populates="question", cascade="all, delete-orphan")
    practice_attempts = relationship("PracticeAttempt", back_populates="question", cascade="all, delete-orphan")
    follow_ups = relationship("InterviewQuestion", remote_side=[parent_question_id])

class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    audio_path = Column(String(512), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    is_text_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    question = relationship("InterviewQuestion", back_populates="answers")
    transcript = relationship("Transcript", back_populates="answer", uselist=False, cascade="all, delete-orphan")
    evaluation = relationship("AnswerEvaluation", back_populates="answer", uselist=False, cascade="all, delete-orphan")

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    answer_id = Column(String(36), ForeignKey("interview_answers.id", ondelete="CASCADE"), nullable=False, unique=True)
    transcript_text = Column(Text, nullable=False)
    confidence_score = Column(Float, default=1.0)
    is_reliable = Column(Boolean, default=True)
    quality_flag = Column(String(64), default="good")  # good, low_confidence, empty, unintelligible
    created_at = Column(DateTime(timezone=True), default=utc_now)

    answer = relationship("InterviewAnswer", back_populates="transcript")
    nlp_analysis = relationship("NLPAnalysis", back_populates="transcript", uselist=False, cascade="all, delete-orphan")

class NLPAnalysis(Base):
    __tablename__ = "nlp_analyses"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    transcript_id = Column(String(36), ForeignKey("transcripts.id", ondelete="CASCADE"), nullable=False, unique=True)
    intent = Column(String(64), nullable=False)  # answer, clarification_request, repeat_request, skip_request, off_topic, unintelligible, other
    intent_confidence = Column(Float, default=1.0)
    semantic_relevance = Column(String(64), default="relevant")  # relevant, partially_relevant, irrelevant
    relevance_score = Column(Float, default=1.0)
    detected_concepts = Column(JSON, default=list)  # [{"concept": "...", "status": "present|absent|uncertain"}]
    model_version = Column(String(64), default="distilbert-voice-agent-v1")
    used_fallback = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    transcript = relationship("Transcript", back_populates="nlp_analysis")

class AnswerEvaluation(Base):
    __tablename__ = "answer_evaluations"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    answer_id = Column(String(36), ForeignKey("interview_answers.id", ondelete="CASCADE"), nullable=False, unique=True)
    technical_score = Column(Integer, default=3)  # 0 to 5
    relevance_score = Column(Integer, default=3)  # 0 to 5
    completeness_score = Column(Integer, default=3)  # 0 to 5
    problem_solving_score = Column(Integer, default=3)  # 0 to 5
    communication_score = Column(Integer, default=3)  # 0 to 5
    overall_answer_score = Column(Float, default=3.0)
    justifications = Column(JSON, default=dict)
    evidence_quotes = Column(JSON, default=list)
    missing_concepts = Column(JSON, default=list)
    unsupported_claims = Column(JSON, default=list)
    insufficient_evidence = Column(Boolean, default=False)
    evaluator_model = Column(String(64), default="evaluator-agent-v1")
    created_at = Column(DateTime(timezone=True), default=utc_now)

    answer = relationship("InterviewAnswer", back_populates="evaluation")

class InterviewReport(Base):
    __tablename__ = "interview_reports"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True)
    overall_score = Column(Float, nullable=False)  # 0 to 100 or 0 to 5
    technical_avg = Column(Float, default=0.0)
    relevance_avg = Column(Float, default=0.0)
    completeness_avg = Column(Float, default=0.0)
    problem_solving_avg = Column(Float, default=0.0)
    communication_avg = Column(Float, default=0.0)
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    missing_concepts = Column(JSON, default=list)
    revision_topics = Column(JSON, default=list)
    practice_exercises = Column(JSON, default=list)
    summary = Column(Text, nullable=True)
    disclaimer = Column(Text, default="AI-generated scores are estimates intended for practice, not definitive assessments of employability.")
    pdf_path = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    session = relationship("InterviewSession", back_populates="report")

class PracticeAttempt(Base):
    __tablename__ = "practice_attempts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_question_id = Column(String(36), ForeignKey("interview_questions.id", ondelete="CASCADE"), nullable=False)
    attempt_number = Column(Integer, default=1)
    transcript_text = Column(Text, nullable=False)
    scores = Column(JSON, default=dict)  # {"technical": ..., ...}
    score_comparison = Column(JSON, default=dict)  # {"before": ..., "after": ..., "improvement": ...}
    feedback = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="practice_attempts")
    question = relationship("InterviewQuestion", back_populates="practice_attempts")

class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    component_name = Column(String(64), nullable=False)  # nlp_intent, answer_evaluator, stt, resume_parser
    version_tag = Column(String(64), nullable=False)
    parameters = Column(JSON, default=dict)
    metrics = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=True)
    camera_consent = Column(Boolean, default=False)
    mic_consent = Column(Boolean, default=False)
    data_retention_acknowledged = Column(Boolean, default=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    user = relationship("User", back_populates="consent_records")
    session = relationship("InterviewSession", back_populates="consent_record")


class ProctoringEvent(Base):
    __tablename__ = "proctoring_events"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False)  # multiple_faces, face_absent, looking_away, camera_interruption, tab_switch, unauthorized_object
    timestamp = Column(DateTime(timezone=True), default=utc_now)
    confidence_score = Column(Float, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    severity = Column(String(32), default="warning")  # info, warning, critical, terminal
    action_taken = Column(String(64), default="warning_displayed")  # warning_displayed, interview_paused, interview_halted
    explanation = Column(Text, nullable=True)

    session = relationship("InterviewSession", back_populates="proctoring_events")
    user = relationship("User", back_populates="proctoring_events")
