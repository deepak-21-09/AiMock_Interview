import os
import pytest
from datetime import datetime, timezone
from app.schemas.proctoring import (
    ProctoringEventCreate,
    ProctoringEventResponse,
    ProctoringTerminationRequest,
    ProctoringTerminationResponse,
    ProctoringSummarySchema
)
from app.schemas.report import InterviewReportResponse, DimensionScoresSchema
from app.services.pdf_generator import generate_styled_pdf_report

def test_proctoring_schemas():
    now = datetime.now(timezone.utc)
    ev_create = ProctoringEventCreate(
        event_type="multiple_faces",
        timestamp=now,
        confidence_score=0.92,
        duration_seconds=2.5,
        severity="warning",
        action_taken="warning_displayed",
        explanation="2 faces detected in frame for 2.5s."
    )
    assert ev_create.event_type == "multiple_faces"
    assert ev_create.duration_seconds == 2.5

    term_req = ProctoringTerminationRequest(
        violation_type="multiple_faces",
        explanation="Multiple faces persisted past grace period (3.0s).",
        confidence_score=0.95,
        duration_seconds=5.5
    )
    assert term_req.violation_type == "multiple_faces"

    summary = ProctoringSummarySchema(
        total_events=2,
        warning_count=1,
        critical_count=1,
        is_terminated=True,
        termination_reason="Multiple faces persisted past grace period.",
        events=[]
    )
    assert summary.total_events == 2
    assert summary.is_terminated is True
    assert summary.termination_reason is not None

def test_pdf_report_with_proctoring(tmp_path):
    output_pdf = str(tmp_path / "test_report_proctoring.pdf")
    now = datetime.now()
    report_data = {
        "candidate_name": "Test Candidate",
        "target_role": "Backend Engineer",
        "session_id_display": "INT-2026-TEST",
        "interview_date": now.strftime("%b %d, %Y"),
        "interview_time": now.strftime("(%I:%M %p)"),
        "duration": "15 minutes",
        "status": "Terminated_proctoring",
        "questions_answered": "2 / 5",
        "overall_score": 72.0,
        "technical_avg": 3.8,
        "communication_avg": 3.5,
        "problem_solving_avg": 3.6,
        "relevance_avg": 3.7,
        "tech_score_100": 76,
        "comm_score_100": 70,
        "behav_score_100": 73,
        "strengths": ["Clear explanation of ACID properties", "Structured code walkthrough"],
        "issues": ["Candidate looking away for prolonged periods", "Multiple people detected"],
        "weaknesses": ["Improve depth of caching mechanisms"],
        "missing_concepts": ["Write-through cache"],
        "revision_topics": ["Distributed Systems"],
        "practice_exercises": ["Design a rate limiter"],
        "final_feedback": "Strong foundational technical responses before session termination.",
        "recommendation": "Review proctoring guidelines before re-attempting mock interview.",
        "proctoring": {
            "total_events": 2,
            "warning_count": 1,
            "critical_count": 1,
            "is_terminated": True,
            "termination_reason": "Multiple people detected in interview frame past grace period.",
            "events": [
                {
                    "event_type": "looking_away",
                    "timestamp": "14:22:10",
                    "severity": "warning",
                    "action_taken": "warning_displayed",
                    "explanation": "Head pose yaw deviation > 30 degrees for 5s."
                },
                {
                    "event_type": "multiple_faces",
                    "timestamp": "14:23:45",
                    "severity": "terminal",
                    "action_taken": "interview_halted",
                    "explanation": "2 faces detected in frame for 4.2s."
                }
            ]
        }
    }

    res_path = generate_styled_pdf_report("test-session-id", report_data, output_pdf)
    assert os.path.exists(res_path)
    assert os.path.getsize(res_path) > 1000  # Valid PDF size
