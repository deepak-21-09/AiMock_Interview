from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class ProctoringEventCreate(BaseModel):
    event_type: str = Field(..., description="multiple_faces, face_absent, looking_away, camera_interruption, tab_switch, unauthorized_object")
    timestamp: Optional[datetime] = None
    confidence_score: Optional[float] = None
    duration_seconds: float = 0.0
    severity: str = Field("warning", description="info, warning, critical, terminal")
    action_taken: str = Field("warning_displayed", description="warning_displayed, interview_paused, interview_halted")
    explanation: Optional[str] = None

class ProctoringEventResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    event_type: str
    timestamp: datetime
    confidence_score: Optional[float] = None
    duration_seconds: float = 0.0
    severity: str
    action_taken: str
    explanation: Optional[str] = None

    class Config:
        from_attributes = True

class ProctoringTerminationRequest(BaseModel):
    violation_type: str = Field(..., description="multiple_faces, face_absent_timeout, camera_unrecovered, tab_switches_exceeded")
    explanation: str
    timestamp: Optional[datetime] = None
    confidence_score: Optional[float] = None
    duration_seconds: float = 0.0

class ProctoringTerminationResponse(BaseModel):
    session_id: str
    status: str
    message: str
    termination_reason: str
    terminated_at: datetime
    report_id: Optional[str] = None

class ProctoringSummarySchema(BaseModel):
    total_events: int = 0
    warning_count: int = 0
    critical_count: int = 0
    is_terminated: bool = False
    termination_reason: Optional[str] = None
    events: List[ProctoringEventResponse] = []
