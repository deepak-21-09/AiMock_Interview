import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import (
    User, Resume, InterviewSession, InterviewRound, InterviewQuestion, ConsentRecord
)
from app.schemas.interview import (
    InterviewPlanRequest,
    InterviewPlanResponse,
    PlannedQuestionSchema,
    StartInterviewRequest,
    AnswerSubmissionRequest,
    TurnActionResponse,
    InterviewSessionDetailResponse,
    QuestionDetailSchema
)
from app.agents.interview_planner import interview_planner
from app.agents.interviewer import interviewer_agent
from app.orchestrator.interview_orchestrator import interview_orchestrator

router = APIRouter()

@router.post("/plan", response_model=InterviewPlanResponse)
async def generate_plan(
    payload: InterviewPlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    skills, projects = [], []
    resume_summary = None

    if payload.resume_id:
        stmt = select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
        res = await db.execute(stmt)
        r = res.scalar_one_or_none()
        if r:
            skills = r.parsed_skills or []
            projects = r.parsed_projects or []
            resume_summary = {
                "skills_count": len(skills),
                "projects_count": len(projects),
                "matched_skills": r.job_match.get("matched_skills", []) if r.job_match else []
            }

    planned_questions = interview_planner.generate_plan(
        target_role=payload.target_role,
        job_description=payload.job_description,
        skills=skills,
        projects=projects,
        rounds=payload.rounds,
        num_questions=payload.num_questions,
        starting_diff=payload.starting_difficulty
    )

    # Pre-create session in "draft" status
    session = InterviewSession(
        user_id=current_user.id,
        resume_id=payload.resume_id,
        target_role=payload.target_role,
        job_description=payload.job_description,
        status="draft",
        starting_difficulty=payload.starting_difficulty,
        current_difficulty=payload.starting_difficulty,
        target_rounds=payload.rounds,
        total_planned_questions=len(planned_questions),
        duration_minutes=payload.duration_minutes,
        interaction_mode=payload.interaction_mode
    )
    db.add(session)
    await db.flush()

    # Pre-populate rounds
    round_map = {}
    for idx, r_type in enumerate(payload.rounds):
        rnd = InterviewRound(session_id=session.id, round_type=r_type, round_order=idx + 1)
        db.add(rnd)
        await db.flush()
        round_map[r_type] = rnd.id

    # Pre-populate questions
    question_schemas = []
    for q_data in planned_questions:
        rnd_id = round_map.get(q_data.get("round_type", "technical"))
        q = InterviewQuestion(
            id=q_data.get("id", str(uuid.uuid4())),
            session_id=session.id,
            round_id=rnd_id,
            question_text=q_data["question_text"],
            difficulty=q_data.get("difficulty", payload.starting_difficulty),
            competency_focus=q_data.get("competency_focus", "Core Competency"),
            expected_concepts=q_data.get("expected_concepts", []),
            source_reference=q_data.get("source_reference", ""),
            order_index=q_data.get("order_index", 1),
            status="pending"
        )
        db.add(q)
        question_schemas.append(PlannedQuestionSchema(
            id=q.id,
            order_index=q.order_index,
            round_type=q_data.get("round_type", "technical"),
            difficulty=q.difficulty,
            question_text=q.question_text,
            competency_focus=q.competency_focus,
            expected_concepts=q.expected_concepts,
            source_reference=q.source_reference
        ))

    await db.commit()

    return InterviewPlanResponse(
        session_id=session.id,
        target_role=session.target_role,
        rounds=payload.rounds,
        total_questions=len(question_schemas),
        duration_minutes=payload.duration_minutes,
        starting_difficulty=payload.starting_difficulty,
        questions=question_schemas,
        resume_summary=resume_summary
    )

@router.get("", response_model=List[InterviewSessionDetailResponse])
async def list_interviews(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = (
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    out = []
    for s in sessions:
        out.append(InterviewSessionDetailResponse(
            id=s.id,
            target_role=s.target_role,
            job_description=s.job_description,
            status=s.status,
            current_difficulty=s.current_difficulty,
            starting_difficulty=s.starting_difficulty,
            total_planned_questions=s.total_planned_questions,
            duration_minutes=s.duration_minutes,
            interaction_mode=s.interaction_mode,
            created_at=s.created_at,
            overall_score=s.overall_score,
            report_id=s.report.id if s.report else None,
            current_question=None,
            questions=[]
        ))
    return out

@router.get("/{session_id}", response_model=InterviewSessionDetailResponse)
async def get_interview_detail(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    # Questions list
    q_stmt = select(InterviewQuestion).where(InterviewQuestion.session_id == s.id).order_by(InterviewQuestion.order_index.asc())
    q_res = await db.execute(q_stmt)
    questions = q_res.scalars().all()

    q_schemas = []
    curr_q_schema = None
    for q in questions:
        round_name = q.round.round_type if q.round else "technical"
        schema_item = QuestionDetailSchema(
            id=q.id,
            order_index=q.order_index,
            round_type=round_name,
            difficulty=q.difficulty,
            question_text=q.question_text,
            competency_focus=q.competency_focus,
            is_followup=q.is_followup,
            status=q.status
        )
        q_schemas.append(schema_item)
        if q.status == "pending" and curr_q_schema is None:
            curr_q_schema = schema_item

    return InterviewSessionDetailResponse(
        id=s.id,
        target_role=s.target_role,
        job_description=s.job_description,
        status=s.status,
        current_difficulty=s.current_difficulty,
        starting_difficulty=s.starting_difficulty,
        total_planned_questions=s.total_planned_questions,
        duration_minutes=s.duration_minutes,
        interaction_mode=s.interaction_mode,
        created_at=s.created_at,
        current_question=curr_q_schema,
        questions=q_schemas,
        overall_score=s.overall_score,
        report_id=s.report.id if s.report else None
    )

@router.post("/{session_id}/start", response_model=TurnActionResponse)
async def start_interview(
    session_id: str,
    payload: StartInterviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Save consent
    consent = ConsentRecord(
        user_id=current_user.id,
        session_id=session.id,
        camera_consent=payload.camera_consent,
        mic_consent=payload.mic_consent,
        data_retention_acknowledged=payload.data_retention_acknowledged
    )
    db.add(consent)

    session.status = "active"
    await db.commit()

    # Retrieve first pending question
    q_stmt = select(InterviewQuestion).where(InterviewQuestion.session_id == session.id, InterviewQuestion.status == "pending").order_by(InterviewQuestion.order_index.asc())
    q_res = await db.execute(q_stmt)
    first_q = q_res.scalars().first()

    if not first_q:
        raise HTTPException(status_code=400, detail="No planned questions available.")

    first_q_detail = QuestionDetailSchema(
        id=first_q.id,
        order_index=first_q.order_index,
        round_type=first_q.round.round_type if first_q.round else "technical",
        difficulty=first_q.difficulty,
        question_text=first_q.question_text,
        competency_focus=first_q.competency_focus,
        is_followup=first_q.is_followup,
        status=first_q.status
    )

    return TurnActionResponse(
        action="next_question",
        message="Interview session started. Welcome!",
        current_difficulty=session.current_difficulty,
        next_question=first_q_detail,
        is_concluded=False,
        session_status="active"
    )

@router.post("/{session_id}/answer", response_model=TurnActionResponse)
async def submit_answer(
    session_id: str,
    payload: AnswerSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    res_action = await interview_orchestrator.handle_candidate_turn(
        db=db,
        session_id=session_id,
        question_id=payload.question_id,
        audio_base64=payload.audio_base64,
        text_answer=payload.text_answer,
        duration_seconds=payload.duration_seconds
    )
    return TurnActionResponse(**res_action)

@router.post("/{session_id}/repeat", response_model=TurnActionResponse)
async def repeat_question(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    q_stmt = select(InterviewQuestion).where(InterviewQuestion.session_id == session.id, InterviewQuestion.status == "pending").order_by(InterviewQuestion.order_index.asc())
    q_res = await db.execute(q_stmt)
    curr_q = q_res.scalars().first()
    if not curr_q:
        raise HTTPException(status_code=400, detail="No active question to repeat.")

    formatted_q = QuestionDetailSchema(
        id=curr_q.id,
        order_index=curr_q.order_index,
        round_type=curr_q.round.round_type if curr_q.round else "technical",
        difficulty=curr_q.difficulty,
        question_text=curr_q.question_text,
        competency_focus=curr_q.competency_focus,
        is_followup=curr_q.is_followup,
        status=curr_q.status
    )

    return TurnActionResponse(
        action="repeat",
        message=f"Repeating question: {curr_q.question_text}",
        current_difficulty=session.current_difficulty,
        next_question=formatted_q,
        is_concluded=False,
        session_status=session.status
    )

@router.post("/{session_id}/clarify", response_model=TurnActionResponse)
async def clarify_question(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    q_stmt = select(InterviewQuestion).where(InterviewQuestion.session_id == session.id, InterviewQuestion.status == "pending").order_by(InterviewQuestion.order_index.asc())
    q_res = await db.execute(q_stmt)
    curr_q = q_res.scalars().first()
    if not curr_q:
        raise HTTPException(status_code=400, detail="No active question to clarify.")

    round_type = curr_q.round.round_type if curr_q.round else "technical"
    clarification = interviewer_agent.explain_clarification(curr_q.question_text, round_type)

    formatted_q = QuestionDetailSchema(
        id=curr_q.id,
        order_index=curr_q.order_index,
        round_type=round_type,
        difficulty=curr_q.difficulty,
        question_text=curr_q.question_text,
        competency_focus=curr_q.competency_focus,
        is_followup=curr_q.is_followup,
        status=curr_q.status
    )

    return TurnActionResponse(
        action="clarify",
        message=clarification,
        current_difficulty=session.current_difficulty,
        next_question=formatted_q,
        is_concluded=False,
        session_status=session.status
    )

@router.post("/{session_id}/skip", response_model=TurnActionResponse)
async def skip_question(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    q_stmt = select(InterviewQuestion).where(InterviewQuestion.session_id == session.id, InterviewQuestion.status == "pending").order_by(InterviewQuestion.order_index.asc())
    q_res = await db.execute(q_stmt)
    curr_q = q_res.scalars().first()
    if not curr_q:
        raise HTTPException(status_code=400, detail="No active question to skip.")

    curr_q.status = "skipped"
    await db.commit()

    # Look for next question
    next_res = await db.execute(
        select(InterviewQuestion)
        .where(InterviewQuestion.session_id == session.id, InterviewQuestion.status == "pending")
        .order_by(InterviewQuestion.order_index.asc())
    )
    next_q = next_res.scalars().first()

    if next_q:
        next_formatted = QuestionDetailSchema(
            id=next_q.id,
            order_index=next_q.order_index,
            round_type=next_q.round.round_type if next_q.round else "technical",
            difficulty=next_q.difficulty,
            question_text=next_q.question_text,
            competency_focus=next_q.competency_focus,
            is_followup=next_q.is_followup,
            status=next_q.status
        )
        return TurnActionResponse(
            action="next_question",
            message=f"Question skipped. Advancing to question {next_q.order_index}.",
            current_difficulty=session.current_difficulty,
            next_question=next_formatted,
            is_concluded=False,
            session_status=session.status
        )

    # Conclude session if no questions remain
    conclude_res = await interview_orchestrator.conclude_interview(db, session.id)
    return TurnActionResponse(**conclude_res)

@router.post("/{session_id}/end", response_model=TurnActionResponse)
async def end_interview(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(InterviewSession).where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    conclude_res = await interview_orchestrator.conclude_interview(db, session.id)
    return TurnActionResponse(**conclude_res)
