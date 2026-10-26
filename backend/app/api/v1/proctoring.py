import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import User, InterviewSession, ProctoringEvent, InterviewReport
from app.schemas.proctoring import (
    ProctoringEventCreate,
    ProctoringEventResponse,
    ProctoringTerminationRequest,
    ProctoringTerminationResponse,
    ProctoringSummarySchema
)
from app.orchestrator.interview_orchestrator import interview_orchestrator

router = APIRouter()

def utc_now():
    return datetime.now(timezone.utc)

@router.post("/{session_id}/proctoring/event", response_model=ProctoringEventResponse)
async def log_proctoring_event(
    session_id: str,
    payload: ProctoringEventCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.status == "terminated_proctoring":
        raise HTTPException(
            status_code=400,
            detail="Interview has already been terminated due to a proctoring violation."
        )

    event = ProctoringEvent(
        id=str(uuid.uuid4()),
        session_id=session.id,
        user_id=current_user.id,
        event_type=payload.event_type,
        timestamp=payload.timestamp or utc_now(),
        confidence_score=payload.confidence_score,
        duration_seconds=payload.duration_seconds,
        severity=payload.severity,
        action_taken=payload.action_taken,
        explanation=payload.explanation
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return event

@router.post("/{session_id}/proctoring/terminate", response_model=ProctoringTerminationResponse)
async def terminate_interview_proctoring(
    session_id: str,
    payload: ProctoringTerminationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    now = utc_now()

    # Log terminal event
    terminal_event = ProctoringEvent(
        id=str(uuid.uuid4()),
        session_id=session.id,
        user_id=current_user.id,
        event_type=payload.violation_type,
        timestamp=payload.timestamp or now,
        confidence_score=payload.confidence_score,
        duration_seconds=payload.duration_seconds,
        severity="terminal",
        action_taken="interview_halted",
        explanation=payload.explanation
    )
    db.add(terminal_event)

    # Set terminal session status
    session.status = "terminated_proctoring"
    await db.commit()

    # Attempt to synthesize / conclude partial report so candidate can see review
    report_id = None
    try:
        conclude_res = await interview_orchestrator.conclude_interview(db, session.id)
        report_id = conclude_res.get("report_id")
        # Ensure status remains terminated_proctoring even after report generation
        session.status = "terminated_proctoring"
        await db.commit()
    except Exception as e:
        # If no answers were answered yet or synthesis encountered edge case
        pass

    return ProctoringTerminationResponse(
        session_id=session.id,
        status="terminated_proctoring",
        message="Interview halted immediately due to confirmed integrity violation.",
        termination_reason=payload.explanation,
        terminated_at=now,
        report_id=report_id
    )

@router.get("/{session_id}/proctoring/events", response_model=List[ProctoringEventResponse])
async def get_proctoring_events(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    e_stmt = select(ProctoringEvent).where(ProctoringEvent.session_id == session.id).order_by(ProctoringEvent.timestamp.asc())
    e_res = await db.execute(e_stmt)
    return e_res.scalars().all()

@router.get("/{session_id}/proctoring/summary", response_model=ProctoringSummarySchema)
async def get_proctoring_summary(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    e_stmt = select(ProctoringEvent).where(ProctoringEvent.session_id == session.id).order_by(ProctoringEvent.timestamp.asc())
    e_res = await db.execute(e_stmt)
    events = e_res.scalars().all()

    warn_count = sum(1 for e in events if e.severity == "warning")
    crit_count = sum(1 for e in events if e.severity in ["critical", "terminal"])
    is_term = session.status == "terminated_proctoring"
    term_reason = next((e.explanation for e in reversed(events) if e.severity == "terminal"), None)

    return ProctoringSummarySchema(
        total_events=len(events),
        warning_count=warn_count,
        critical_count=crit_count,
        is_terminated=is_term,
        termination_reason=term_reason,
        events=[ProctoringEventResponse.model_validate(e) for e in events]
    )
