import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import (
    User, InterviewSession, InterviewReport, InterviewQuestion, InterviewAnswer, ProctoringEvent
)
from app.schemas.report import (
    InterviewReportResponse,
    DimensionScoresSchema,
    QuestionReviewSchema
)
from app.schemas.proctoring import ProctoringSummarySchema, ProctoringEventResponse

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
        .options(
            selectinload(InterviewQuestion.round),
            selectinload(InterviewQuestion.answers).selectinload(InterviewAnswer.transcript),
            selectinload(InterviewQuestion.answers).selectinload(InterviewAnswer.evaluation)
        )
        .where(InterviewQuestion.session_id == session.id)
        .order_by(InterviewQuestion.order_index.asc())
    )
    q_res = await db.execute(q_stmt)
    questions = q_res.scalars().all()

    q_reviews = []
    for q in questions:
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

    p_stmt = (
        select(ProctoringEvent)
        .where(ProctoringEvent.session_id == session.id)
        .order_by(ProctoringEvent.timestamp.asc())
    )
    p_res = await db.execute(p_stmt)
    p_events = p_res.scalars().all()

    proctoring_summary = None
    if p_events or session.status == "terminated_proctoring":
        warn_count = sum(1 for e in p_events if e.severity == "warning")
        crit_count = sum(1 for e in p_events if e.severity in ["critical", "terminal"])
        is_term = session.status == "terminated_proctoring"
        term_reason = next((e.explanation for e in reversed(p_events) if e.severity == "terminal"), None)
        proctoring_summary = ProctoringSummarySchema(
            total_events=len(p_events),
            warning_count=warn_count,
            critical_count=crit_count,
            is_terminated=is_term,
            termination_reason=term_reason,
            events=[ProctoringEventResponse.model_validate(e) for e in p_events]
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
        questions=q_reviews,
        proctoring=proctoring_summary
    )

@router.get("/{session_id}/report/pdf")
async def download_pdf_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(InterviewSession)
        .options(
            selectinload(InterviewSession.user).selectinload(User.profile),
            selectinload(InterviewSession.questions).selectinload(InterviewQuestion.answers).selectinload(InterviewAnswer.evaluation)
        )
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
        raise HTTPException(status_code=404, detail="PDF report file not found.")

    os.makedirs("./media", exist_ok=True)
    pdf_path = f"./media/report_{session.id}.pdf"

    # Candidate Name
    candidate_name = "Candidate"
    if session.user and session.user.profile and session.user.profile.full_name:
        candidate_name = session.user.profile.full_name
    elif session.user and session.user.email:
        candidate_name = session.user.email.split("@")[0].replace(".", " ").title()

    # Formatted Date & Time & Display ID
    if session.created_at:
        interview_date = session.created_at.strftime("%b %d, %Y")
        interview_time = session.created_at.strftime("(%I:%M %p)")
        display_id = f"INT-{session.created_at.strftime('%Y-%m-%d')}-{session.id[:3].upper()}"
    else:
        interview_date = "Apr 26, 2025"
        interview_time = "(10:30 AM)"
        display_id = f"INT-{session.id[:8].upper()}"

    # Duration & Questions
    duration = f"{session.duration_minutes or 15} minutes"
    status = session.status.capitalize() if session.status else "Completed"

    questions = session.questions or []
    answered_count = len([q for q in questions if q.status == "answered"])
    total_count = len(questions) if len(questions) > 0 else (session.total_planned_questions or 5)
    questions_answered = f"{answered_count} / {total_count}"

    # Recorded Issues
    issues = []
    skipped_count = len([q for q in questions if q.status == "skipped"])
    if skipped_count > 0:
        issues.append(f"Skipped {skipped_count} question{'s' if skipped_count > 1 else ''} due to time management.")

    incomplete_count = 0
    for q in questions:
        for a in q.answers:
            if a.evaluation and (a.evaluation.insufficient_evidence or a.evaluation.completeness_score < 3):
                incomplete_count += 1
                break
    if incomplete_count > 0:
        issues.append(f"Gave an incomplete answer for {incomplete_count} technical question{'s' if incomplete_count > 1 else ''}.")

    if not issues:
        issues = ["No significant interview issues were recorded."]

    # Category scores out of 100
    tech_score_100 = round((rep.technical_avg / 5.0) * 100)
    comm_score_100 = round((rep.communication_avg / 5.0) * 100)
    behav_score_100 = round((((rep.problem_solving_avg + rep.relevance_avg) / 2.0) / 5.0) * 100)

    # Recommendation
    if rep.overall_score >= 80:
        recommendation = "Ready for advanced technical interview rounds with high confidence."
    elif rep.overall_score >= 65:
        recommendation = "Ready for the next level with focused practice."
    else:
        recommendation = "Continue practicing core fundamentals before the next interview round."

    # Proctoring Summary for PDF
    p_stmt = (
        select(ProctoringEvent)
        .where(ProctoringEvent.session_id == session.id)
        .order_by(ProctoringEvent.timestamp.asc())
    )
    p_res = await db.execute(p_stmt)
    p_events = p_res.scalars().all()

    proctoring_data = None
    if p_events or session.status == "terminated_proctoring":
        proctoring_data = {
            "total_events": len(p_events),
            "warning_count": sum(1 for e in p_events if e.severity == "warning"),
            "critical_count": sum(1 for e in p_events if e.severity in ["critical", "terminal"]),
            "is_terminated": session.status == "terminated_proctoring",
            "termination_reason": next((e.explanation for e in reversed(p_events) if e.severity == "terminal"), None),
            "events": [
                {
                    "event_type": e.event_type,
                    "timestamp": e.timestamp.strftime("%H:%M:%S") if e.timestamp else "",
                    "severity": e.severity,
                    "action_taken": e.action_taken,
                    "explanation": e.explanation
                }
                for e in p_events
            ]
        }

    report_data = {
        "candidate_name": candidate_name,
        "target_role": session.target_role,
        "session_id_display": display_id,
        "interview_date": interview_date,
        "interview_time": interview_time,
        "duration": duration,
        "status": status,
        "questions_answered": questions_answered,
        "overall_score": rep.overall_score,
        "technical_avg": rep.technical_avg,
        "communication_avg": rep.communication_avg,
        "problem_solving_avg": rep.problem_solving_avg,
        "relevance_avg": rep.relevance_avg,
        "tech_score_100": tech_score_100,
        "comm_score_100": comm_score_100,
        "behav_score_100": behav_score_100,
        "strengths": rep.strengths or [],
        "issues": issues,
        "weaknesses": rep.weaknesses or [],
        "missing_concepts": rep.missing_concepts or [],
        "revision_topics": rep.revision_topics or [],
        "practice_exercises": rep.practice_exercises or [],
        "final_feedback": rep.summary,
        "recommendation": recommendation,
        "proctoring": proctoring_data
    }

    from app.services.pdf_generator import generate_styled_pdf_report
    generate_styled_pdf_report(session.id, report_data, pdf_path)
    rep.pdf_path = pdf_path
    await db.commit()

    safe_filename = f"Interview_Report_{session.target_role.replace(' ', '_')}_{session.id[:8]}.pdf"
    return FileResponse(
        path=rep.pdf_path,
        media_type="application/pdf",
        filename=safe_filename,
        headers={"Content-Disposition": f'attachment; filename="{safe_filename}"'}
    )
