from app.schemas.proctoring import ProctoringSummarySchema
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class DimensionScoresSchema(BaseModel):
    technical: float
    relevance: float
    completeness: float
    problem_solving: float
    communication: float
    overall: float

class QuestionReviewSchema(BaseModel):
    question_id: str
    question_text: str
    round_type: str
    difficulty: int
    is_followup: bool
    status: str
    transcript: Optional[str] = None
    scores: Optional[Dict[str, int]] = None  # {technical: 4, relevance: 5, ...}
    justifications: Optional[Dict[str, str]] = None
    evidence_quotes: List[str] = []
    missing_concepts: List[str] = []
    unsupported_claims: List[str] = []
    insufficient_evidence: bool = False

class InterviewReportResponse(BaseModel):
    id: str
    session_id: str
    target_role: str
    created_at: datetime
    overall_score: float  # Scale 0 to 100
    dimension_scores: DimensionScoresSchema
    strengths: List[str] = []
    weaknesses: List[str] = []
    missing_concepts: List[str] = []
    revision_topics: List[str] = []
    practice_exercises: List[str] = []
    summary: str
    disclaimer: str
    pdf_download_url: Optional[str] = None
    questions: List[QuestionReviewSchema] = []
    proctoring: Optional[ProctoringSummarySchema] = None

    class Config:
        from_attributes = True

class PracticeRetryRequest(BaseModel):
    text_answer: Optional[str] = None
    audio_base64: Optional[str] = None
    duration_seconds: float = 0.0

class PracticeComparisonResponse(BaseModel):
    attempt_id: str
    question_id: str
    attempt_number: int
    original_scores: Dict[str, int]
    new_scores: Dict[str, int]
    score_change: Dict[str, int]
    transcript: str
    feedback: str
    created_at: datetime
