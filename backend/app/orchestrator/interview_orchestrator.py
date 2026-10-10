from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Any, Optional, List
import uuid

from app.models.entities import (
    InterviewSession,
    InterviewQuestion,
    InterviewAnswer,
    Transcript,
    NLPAnalysis,
    AnswerEvaluation,
    InterviewReport
)
from app.services.speech_to_text import stt_service
from app.agents.nlp_voice_agent import nlp_voice_agent
from app.agents.interviewer import interviewer_agent
from app.agents.answer_evaluator import answer_evaluator
from app.agents.feedback_coaching import feedback_coach

class CentralInterviewOrchestrator:
    """
    Central controller orchestrating all interview turns, transitions,
    deterministic adaptive decision rules, and report synthesis.
    """

    async def handle_candidate_turn(
        self,
        db: AsyncSession,
        session_id: str,
        question_id: str,
        audio_base64: Optional[str] = None,
        text_answer: Optional[str] = None,
        duration_seconds: float = 0.0
    ) -> Dict[str, Any]:
        # 1. Fetch Session and Question
        stmt = select(InterviewSession).where(InterviewSession.id == session_id)
        res = await db.execute(stmt)
        session = res.scalar_one_or_none()
        if not session:
            raise ValueError("Interview session not found.")

        q_stmt = select(InterviewQuestion).where(InterviewQuestion.id == question_id)
        q_res = await db.execute(q_stmt)
        curr_question = q_res.scalar_one_or_none()
        if not curr_question:
            raise ValueError("Current question not found.")

        # 2. Ingest audio or text
        audio_path = None
        transcript_text = ""
        is_reliable = True
        quality_flag = "good"
        confidence_score = 1.0

        if audio_base64:
            audio_path = stt_service.save_audio_payload(audio_base64)
            transcript_text, confidence_score, is_reliable, quality_flag = stt_service.transcribe(audio_path)
        elif text_answer:
            transcript_text = text_answer.strip()
            confidence_score = 1.0
            is_reliable = len(transcript_text) > 3
            quality_flag = "good" if is_reliable else "empty"
        else:
            return {
                "action": "repeat_prompt_unreliable",
                "message": "No audio or text input received. Please speak clearly into the microphone or type your response.",
                "current_difficulty": session.current_difficulty,
                "next_question": self._format_question(curr_question),
                "is_concluded": False,
                "session_status": session.status,
                "transcript": ""
            }

        # 3. Store Answer record
        answer = InterviewAnswer(
            question_id=curr_question.id,
            session_id=session.id,
            audio_path=audio_path,
            duration_seconds=duration_seconds,
            is_text_fallback=bool(text_answer and not audio_base64)
        )
        db.add(answer)
        await db.flush()

        # 4. Store Transcript record
        transcript_record = Transcript(
            answer_id=answer.id,
            transcript_text=transcript_text,
            confidence_score=confidence_score,
            is_reliable=is_reliable,
            quality_flag=quality_flag
        )
        db.add(transcript_record)
        await db.flush()

        # 5. Check Transcript Reliability
        if not is_reliable or quality_flag in ["empty", "unintelligible"]:
            return {
                "action": "repeat_prompt_unreliable",
                "message": "I could not hear or decipher that clearly. Could you please repeat your answer or type it in?",
                "current_difficulty": session.current_difficulty,
                "next_question": self._format_question(curr_question),
                "is_concluded": False,
                "session_status": session.status,
                "transcript": transcript_text
            }

        # 6. Analyze Turn with Trained NLP Voice Agent
        nlp_res = nlp_voice_agent.analyze_turn(
            question=curr_question.question_text,
            interview_round=curr_question.round.round_type if curr_question.round else "technical",
            transcript=transcript_text,
            expected_concepts=curr_question.expected_concepts or [],
            confidence=confidence_score
        )

        nlp_record = NLPAnalysis(
            transcript_id=transcript_record.id,
            intent=nlp_res["intent"],
            intent_confidence=nlp_res["intent_confidence"],
            semantic_relevance=nlp_res["relevance_label"],
            relevance_score=nlp_res["relevance_score"],
            detected_concepts=nlp_res["detected_concepts"],
            model_version=nlp_res["model_version"],
            used_fallback=nlp_res["used_fallback"]
        )
        db.add(nlp_record)
        await db.flush()

        intent = nlp_res["intent"]

        # 7. Intent-Specific Deterministic Handling
        if intent == "repeat_request":
            return {
                "action": "repeat",
                "message": f"Sure, repeating the question: {curr_question.question_text}",
                "current_difficulty": session.current_difficulty,
                "next_question": self._format_question(curr_question),
                "is_concluded": False,
                "session_status": session.status,
                "transcript": transcript_text
            }

        if intent == "clarification_request":
            round_type = curr_question.round.round_type if curr_question.round else "technical"
            clarification = interviewer_agent.explain_clarification(curr_question.question_text, round_type)
            return {
                "action": "clarify",
                "message": clarification,
                "current_difficulty": session.current_difficulty,
                "next_question": self._format_question(curr_question),
                "is_concluded": False,
                "session_status": session.status,
                "transcript": transcript_text
            }

        if intent == "skip_request":
            curr_question.status = "skipped"
            await db.commit()
            return await self._advance_to_next_question(db, session, curr_question, "Question skipped.")

        # 8. Evaluate Valid Answer via Answer Evaluation Agent
        eval_res = answer_evaluator.evaluate_answer(
            question=curr_question.question_text,
            transcript=transcript_text,
            expected_concepts=curr_question.expected_concepts or [],
            nlp_analysis=nlp_res
        )

        eval_record = AnswerEvaluation(
            answer_id=answer.id,
            technical_score=eval_res["technical_score"],
            relevance_score=eval_res["relevance_score"],
            completeness_score=eval_res["completeness_score"],
            problem_solving_score=eval_res["problem_solving_score"],
            communication_score=eval_res["communication_score"],
            overall_answer_score=eval_res["overall_answer_score"],
            justifications=eval_res["justifications"],
            evidence_quotes=eval_res["evidence_quotes"],
            missing_concepts=eval_res["missing_concepts"],
            unsupported_claims=eval_res["unsupported_claims"],
            insufficient_evidence=eval_res["insufficient_evidence"],
            evaluator_model=eval_res["evaluator_model"]
        )
        db.add(eval_record)
        curr_question.status = "answered"
        await db.commit()

        # 9. Adaptive Decision Rules
        # Rule A: Follow-up check (Completeness <= 2 or critical missing concept AND < 2 follow-ups asked)
        if (eval_res["completeness_score"] <= 2 or len(eval_res["missing_concepts"]) >= 2) and curr_question.follow_up_count < 2:
            follow_up_text = interviewer_agent.generate_follow_up(
                parent_question=curr_question.question_text,
                candidate_transcript=transcript_text,
                missing_concepts=eval_res["missing_concepts"],
                current_diff=session.current_difficulty
            )
            # Create follow-up question
            followup_q = InterviewQuestion(
                session_id=session.id,
                round_id=curr_question.round_id,
                parent_question_id=curr_question.id,
                question_text=follow_up_text,
                difficulty=session.current_difficulty,
                competency_focus=f"Follow-up: {curr_question.competency_focus}",
                expected_concepts=eval_res["missing_concepts"][:3],
                source_reference=f"Follow-up to Q#{curr_question.order_index}",
                order_index=curr_question.order_index,
                is_followup=True,
                status="pending"
            )
            curr_question.follow_up_count += 1
            db.add(followup_q)
            await db.commit()
            await db.refresh(followup_q)

            return {
                "action": "follow_up",
                "message": follow_up_text,
                "current_difficulty": session.current_difficulty,
                "next_question": self._format_question(followup_q),
                "follow_up_count": curr_question.follow_up_count,
                "is_concluded": False,
                "session_status": session.status,
                "transcript": transcript_text,
                "evaluation_preview": {
                    "technical": eval_res["technical_score"],
                    "relevance": eval_res["relevance_score"],
                    "completeness": eval_res["completeness_score"],
                    "overall": eval_res["overall_answer_score"]
                }
            }

        # Rule B: Difficulty adjustment
        avg_score = eval_res["overall_answer_score"]
        if avg_score >= 4.0 and len(eval_res["missing_concepts"]) == 0:
            session.current_difficulty = min(5, session.current_difficulty + 1)
        elif avg_score <= 2.0:
            session.current_difficulty = max(1, session.current_difficulty - 1)

        await db.commit()

        # Rule C: Advance to next question in interview plan
        return await self._advance_to_next_question(db, session, curr_question, "Answer recorded.")

    async def _advance_to_next_question(
        self,
        db: AsyncSession,
        session: InterviewSession,
        curr_question: InterviewQuestion,
        feedback_hint: str
    ) -> Dict[str, Any]:
        # Find next pending question
        stmt = (
            select(InterviewQuestion)
            .where(
                InterviewQuestion.session_id == session.id,
                InterviewQuestion.status == "pending"
            )
            .order_by(InterviewQuestion.order_index.asc())
        )
        res = await db.execute(stmt)
        next_q = res.scalars().first()

        if next_q:
            # Sync next question difficulty with adapted session difficulty
            next_q.difficulty = session.current_difficulty
            await db.commit()

            return {
                "action": "next_question",
                "message": f"Moving to question {next_q.order_index}.",
                "current_difficulty": session.current_difficulty,
                "next_question": self._format_question(next_q),
                "is_concluded": False,
                "session_status": session.status,
                "report_id": None
            }

        # 10. Conclude Interview & Synthesize Final Report
        return await self.conclude_interview(db, session.id)

    async def conclude_interview(self, db: AsyncSession, session_id: str) -> Dict[str, Any]:
        stmt = select(InterviewSession).where(InterviewSession.id == session_id)
        res = await db.execute(stmt)
        session = res.scalar_one_or_none()
        if not session:
            raise ValueError("Session not found.")

        # Collect all evaluations for this session
        eval_stmt = (
            select(AnswerEvaluation)
            .join(InterviewAnswer)
            .where(InterviewAnswer.session_id == session.id)
        )
        eval_res = await db.execute(eval_stmt)
        evaluations = eval_res.scalars().all()

        eval_dicts = [
            {
                "technical_score": e.technical_score,
                "relevance_score": e.relevance_score,
                "completeness_score": e.completeness_score,
                "problem_solving_score": e.problem_solving_score,
                "communication_score": e.communication_score,
                "missing_concepts": e.missing_concepts or []
            }
            for e in evaluations
        ]

        report_summary = feedback_coach.synthesize_report(
            target_role=session.target_role,
            evaluations=eval_dicts,
            questions=[]
        )

        pdf_path = f"./media/report_{session.id}.pdf"
        feedback_coach.generate_pdf_report(session.id, {**report_summary, "target_role": session.target_role}, pdf_path)

        report = InterviewReport(
            session_id=session.id,
            overall_score=report_summary["overall_score"],
            technical_avg=report_summary["technical_avg"],
            relevance_avg=report_summary["relevance_avg"],
            completeness_avg=report_summary["completeness_avg"],
            problem_solving_avg=report_summary["problem_solving_avg"],
            communication_avg=report_summary["communication_avg"],
            strengths=report_summary["strengths"],
            weaknesses=report_summary["weaknesses"],
            missing_concepts=report_summary["missing_concepts"],
            revision_topics=report_summary["revision_topics"],
            practice_exercises=report_summary["practice_exercises"],
            summary=report_summary["summary"],
            pdf_path=pdf_path
        )
        db.add(report)

        session.status = "completed"
        session.overall_score = report_summary["overall_score"]
        await db.commit()
        await db.refresh(report)

        return {
            "action": "concluded",
            "message": "Interview session completed successfully. Your comprehensive performance report is ready.",
            "current_difficulty": session.current_difficulty,
            "next_question": None,
            "is_concluded": True,
            "session_status": "completed",
            "report_id": report.id
        }

    def _format_question(self, q: InterviewQuestion) -> Dict[str, Any]:
        return {
            "id": q.id,
            "order_index": q.order_index,
            "round_type": q.round.round_type if q.round else "technical",
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "competency_focus": q.competency_focus,
            "is_followup": q.is_followup,
            "status": q.status
        }

interview_orchestrator = CentralInterviewOrchestrator()
