from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import User, InterviewSession, Resume, PracticeAttempt, CandidateProfile

router = APIRouter()

@router.get("")
async def get_history(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = (
        select(InterviewSession)
        .options(selectinload(InterviewSession.report))
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()

    history_list = []
    for s in sessions:
        history_list.append({
            "session_id": s.id,
            "target_role": s.target_role,
            "status": s.status,
            "starting_difficulty": s.starting_difficulty,
            "final_difficulty": s.current_difficulty,
            "overall_score": s.overall_score,
            "total_questions": s.total_planned_questions,
            "created_at": s.created_at,
            "has_report": bool(s.report)
        })

    return {
        "history": history_list,
        "total_sessions": len(history_list)
    }

@router.delete("/interviews/{session_id}")
async def delete_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    await db.delete(session)
    await db.commit()
    return {"message": f"Interview session {session_id} deleted successfully."}

@router.delete("/account/data")
async def delete_all_user_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enforces user-controlled privacy right to erasure."""
    await db.execute(delete(InterviewSession).where(InterviewSession.user_id == current_user.id))
    await db.execute(delete(Resume).where(Resume.user_id == current_user.id))
    await db.execute(delete(PracticeAttempt).where(PracticeAttempt.user_id == current_user.id))
    await db.commit()
    return {"message": "All user resumes, interview sessions, and practice records have been permanently erased."}
