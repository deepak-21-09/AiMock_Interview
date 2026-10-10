from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class InterviewPlanRequest(BaseModel):
    resume_id: Optional[str] = None
    target_role: str
    job_description: Optional[str] = None
    rounds: List[str] = ["technical", "behavioral", "situational", "hr"]
    num_questions: int = Field(5, ge=3, le=15)
    starting_difficulty: int = Field(3, ge=1, le=5)
    duration_minutes: int = Field(30, ge=10, le=90)
    interaction_mode: str = "voice"  # voice or text

class PlannedQuestionSchema(BaseModel):
    id: str
    order_index: int
    round_type: str
    difficulty: int
    question_text: str
    competency_focus: str
    expected_concepts: List[str] = []
    source_reference: Optional[str] = None

class InterviewPlanResponse(BaseModel):
    session_id: str
    target_role: str
    rounds: List[str]
    total_questions: int
    duration_minutes: int
    starting_difficulty: int
    questions: List[PlannedQuestionSchema]
    resume_summary: Optional[Dict[str, Any]] = None

class StartInterviewRequest(BaseModel):
    camera_consent: bool = True
    mic_consent: bool = True
    data_retention_acknowledged: bool = True

class QuestionDetailSchema(BaseModel):
    id: str
    order_index: int
    round_type: str
    difficulty: int
    question_text: str
    competency_focus: Optional[str] = None
    is_followup: bool = False
    status: str = "pending"

class AnswerSubmissionRequest(BaseModel):
    question_id: str
    audio_base64: Optional[str] = None
    text_answer: Optional[str] = None
    duration_seconds: float = 0.0

class TurnActionResponse(BaseModel):
    action: str  # next_question, follow_up, repeat, clarify, skip, concluded, repeat_prompt_unreliable
    message: str
    current_difficulty: int
    next_question: Optional[QuestionDetailSchema] = None
    follow_up_count: int = 0
    transcript: Optional[str] = None
    is_concluded: bool = False
    session_status: str
    report_id: Optional[str] = None
    evaluation_preview: Optional[Dict[str, Any]] = None

class InterviewSessionDetailResponse(BaseModel):
    id: str
    target_role: str
    job_description: Optional[str] = None
    status: str
    current_difficulty: int
    starting_difficulty: int
    total_planned_questions: int
    duration_minutes: int
    interaction_mode: str
    created_at: datetime
    current_question: Optional[QuestionDetailSchema] = None
    questions: List[QuestionDetailSchema] = []
    overall_score: Optional[float] = None
    report_id: Optional[str] = None

    class Config:
        from_attributes = True
