import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import User, InterviewSession, InterviewReport, InterviewQuestion
from app.schemas.report import (
    InterviewReportResponse,
    DimensionScoresSchema,
    QuestionReviewSchema
)

router = APIRouter()

@router.get("/{session_id}/report", response_model=InterviewReportResponse)
async def get_interview_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    r_stmt = select(InterviewReport).where(InterviewReport.session_id == session.id)
    r_res = await db.execute(r_stmt)
    rep = r_res.scalar_one_or_none()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not generated yet for this session.")

    # Fetch question evaluations
    q_stmt = (
        select(InterviewQuestion)
        .where(InterviewQuestion.session_id == session.id)
        .order_by(InterviewQuestion.order_index.asc())
    )
    q_res = await db.execute(q_stmt)
    questions = q_res.scalars().all()

    q_reviews = []
    for q in questions:
        # Check answer & evaluation
        ans = q.answers[0] if q.answers else None
        trans = ans.transcript.transcript_text if ans and ans.transcript else None
        eval_rec = ans.evaluation if ans else None

        scores_dict = None
        just_dict = None
        evidence = []
        missing = []
        unsupported = []
        insufficient = False

        if eval_rec:
            scores_dict = {
                "technical": eval_rec.technical_score,
                "relevance": eval_rec.relevance_score,
                "completeness": eval_rec.completeness_score,
                "problem_solving": eval_rec.problem_solving_score,
                "communication": eval_rec.communication_score
            }
            just_dict = eval_rec.justifications or {}
            evidence = eval_rec.evidence_quotes or []
            missing = eval_rec.missing_concepts or []
            unsupported = eval_rec.unsupported_claims or []
            insufficient = eval_rec.insufficient_evidence

        q_reviews.append(QuestionReviewSchema(
            question_id=q.id,
            question_text=q.question_text,
            round_type=q.round.round_type if q.round else "technical",
            difficulty=q.difficulty,
            is_followup=q.is_followup,
            status=q.status,
            transcript=trans,
            scores=scores_dict,
            justifications=just_dict,
            evidence_quotes=evidence,
            missing_concepts=missing,
            unsupported_claims=unsupported,
            insufficient_evidence=insufficient
        ))

    dim_scores = DimensionScoresSchema(
        technical=rep.technical_avg,
        relevance=rep.relevance_avg,
        completeness=rep.completeness_avg,
        problem_solving=rep.problem_solving_avg,
        communication=rep.communication_avg,
        overall=rep.overall_score
    )

    return InterviewReportResponse(
        id=rep.id,
        session_id=session.id,
        target_role=session.target_role,
        created_at=rep.created_at,
        overall_score=rep.overall_score,
        dimension_scores=dim_scores,
        strengths=rep.strengths or [],
        weaknesses=rep.weaknesses or [],
        missing_concepts=rep.missing_concepts or [],
        revision_topics=rep.revision_topics or [],
        practice_exercises=rep.practice_exercises or [],
        summary=rep.summary or "Summary not provided.",
        disclaimer=rep.disclaimer or "AI scores are estimates intended for practice.",
        pdf_download_url=f"/api/v1/interviews/{session.id}/report/pdf",
        questions=q_reviews
    )

@router.get("/{session_id}/report/pdf")
async def download_pdf_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    r_stmt = select(InterviewReport).where(InterviewReport.session_id == session.id)
    r_res = await db.execute(r_stmt)
    rep = r_res.scalar_one_or_none()
    if not rep or not rep.pdf_path or not os.path.exists(rep.pdf_path):
        raise HTTPException(status_code=404, detail="PDF report file not found.")

    return FileResponse(
        path=rep.pdf_path,
        media_type="application/pdf",
        filename=f"Interview_Report_{session.target_role.replace(' ', '_')}_{session.id[:8]}.pdf"
    )
