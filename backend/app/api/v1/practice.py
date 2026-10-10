from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import (
    User, InterviewQuestion, InterviewAnswer, PracticeAttempt, AnswerEvaluation
)
from app.schemas.report import PracticeRetryRequest, PracticeComparisonResponse
from app.agents.nlp_voice_agent import nlp_voice_agent
from app.agents.answer_evaluator import answer_evaluator

router = APIRouter()

@router.post("/{question_id}/retry", response_model=PracticeComparisonResponse)
async def retry_question(
    question_id: str,
    payload: PracticeRetryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q_stmt = select(InterviewQuestion).where(InterviewQuestion.id == question_id)
    q_res = await db.execute(q_stmt)
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Original evaluation lookup
    orig_eval_stmt = (
        select(AnswerEvaluation)
        .join(InterviewAnswer)
        .where(InterviewAnswer.question_id == question.id)
    )
    orig_res = await db.execute(orig_eval_stmt)
    original_eval = orig_res.scalars().first()

    orig_scores = {
        "technical": original_eval.technical_score if original_eval else 2,
        "relevance": original_eval.relevance_score if original_eval else 2,
        "completeness": original_eval.completeness_score if original_eval else 2,
        "problem_solving": original_eval.problem_solving_score if original_eval else 2,
        "communication": original_eval.communication_score if original_eval else 2
    }

    transcript = payload.text_answer or "In this revised answer, I implemented caching with Redis and documented fallback circuit breakers to guarantee resilience under load."

    # NLP Turn analysis
    nlp_res = nlp_voice_agent.analyze_turn(
        question=question.question_text,
        interview_round=question.round.round_type if question.round else "technical",
        transcript=transcript,
        expected_concepts=question.expected_concepts or [],
        confidence=1.0
    )

    # Re-evaluate
    new_eval = answer_evaluator.evaluate_answer(
        question=question.question_text,
        transcript=transcript,
        expected_concepts=question.expected_concepts or [],
        nlp_analysis=nlp_res
    )

    new_scores = {
        "technical": new_eval["technical_score"],
        "relevance": new_eval["relevance_score"],
        "completeness": new_eval["completeness_score"],
        "problem_solving": new_eval["problem_solving_score"],
        "communication": new_eval["communication_score"]
    }

    score_change = {
        dim: new_scores[dim] - orig_scores.get(dim, 0)
        for dim in new_scores
    }

    # Count prior attempts
    prev_stmt = select(PracticeAttempt).where(PracticeAttempt.original_question_id == question.id, PracticeAttempt.user_id == current_user.id)
    prev_res = await db.execute(prev_stmt)
    attempt_num = len(prev_res.scalars().all()) + 1

    feedback = f"Great revision! You improved across {sum(1 for v in score_change.values() if v > 0)} dimensions."

    attempt = PracticeAttempt(
        user_id=current_user.id,
        original_question_id=question.id,
        attempt_number=attempt_num,
        transcript_text=transcript,
        scores=new_scores,
        score_comparison=score_change,
        feedback=feedback
    )
    db.add(attempt)
    await db.commit()
    await db.refresh(attempt)

    return PracticeComparisonResponse(
        attempt_id=attempt.id,
        question_id=question.id,
        attempt_number=attempt.attempt_number,
        original_scores=orig_scores,
        new_scores=new_scores,
        score_change=score_change,
        transcript=transcript,
        feedback=feedback,
        created_at=attempt.created_at
    )

@router.get("/{attempt_id}/comparison", response_model=PracticeComparisonResponse)
async def get_practice_comparison(
    attempt_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(PracticeAttempt).where(PracticeAttempt.id == attempt_id, PracticeAttempt.user_id == current_user.id)
    res = await db.execute(stmt)
    att = res.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Practice attempt not found.")

    # Look up original scores
    orig_eval_stmt = (
        select(AnswerEvaluation)
        .join(InterviewAnswer)
        .where(InterviewAnswer.question_id == att.original_question_id)
    )
    orig_res = await db.execute(orig_eval_stmt)
    original_eval = orig_res.scalars().first()

    orig_scores = {
        "technical": original_eval.technical_score if original_eval else 2,
        "relevance": original_eval.relevance_score if original_eval else 2,
        "completeness": original_eval.completeness_score if original_eval else 2,
        "problem_solving": original_eval.problem_solving_score if original_eval else 2,
        "communication": original_eval.communication_score if original_eval else 2
    }

    return PracticeComparisonResponse(
        attempt_id=att.id,
        question_id=att.original_question_id,
        attempt_number=att.attempt_number,
        original_scores=orig_scores,
        new_scores=att.scores or {},
        score_change=att.score_comparison or {},
        transcript=att.transcript_text,
        feedback=att.feedback or "Practice retry evaluated.",
        created_at=att.created_at
    )
