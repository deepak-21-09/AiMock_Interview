from pydantic import BaseModel, Field
from typing import List, Optional

class DetectedConceptSchema(BaseModel):
    concept: str
    status: str = Field(..., description="present, absent, or uncertain")
    confidence: float = 1.0

class NLPAnalyzeRequest(BaseModel):
    current_question: str
    interview_round: str = "technical"
    candidate_transcript: str
    expected_concepts: List[str] = []
    transcript_confidence: Optional[float] = 1.0

class NLPAnalyzeResponse(BaseModel):
    intent: str = Field(..., description="answer, clarification_request, repeat_request, skip_request, off_topic, unintelligible, other")
    intent_confidence: float
    relevance_label: str = Field(..., description="relevant, partially_relevant, irrelevant")
    relevance_score: float
    detected_concepts: List[DetectedConceptSchema] = []
    transcript_quality_flag: str = "good"
    model_version: str = "distilbert-voice-agent-v1"
    used_fallback: bool = False
