import os
import json
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

class FeedbackCoachingAgent:
    """
    Synthesizes overall interview performance, extracts evidence-based strengths
    and improvement areas, provides tailored practice recommendations, and generates PDF reports.
    """

    def synthesize_report(
        self,
        target_role: str,
        evaluations: List[Dict[str, Any]],
        questions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not evaluations:
            return {
                "overall_score": 0.0,
                "technical_avg": 0.0,
                "relevance_avg": 0.0,
                "completeness_avg": 0.0,
                "problem_solving_avg": 0.0,
                "communication_avg": 0.0,
                "strengths": ["Completed session setup."],
                "weaknesses": ["No substantive answers recorded to evaluate."],
                "missing_concepts": [],
                "revision_topics": ["Core technical interview communication"],
                "practice_exercises": ["Practice answering aloud with clear STAR framework."],
                "summary": "Interview completed with no answers submitted."
            }

        tech_scores = [e.get("technical_score", 0) for e in evaluations]
        rel_scores = [e.get("relevance_score", 0) for e in evaluations]
        comp_scores = [e.get("completeness_score", 0) for e in evaluations]
        prob_scores = [e.get("problem_solving_score", 0) for e in evaluations]
        comm_scores = [e.get("communication_score", 0) for e in evaluations]

        n = len(evaluations)
        tech_avg = round(sum(tech_scores) / n, 2)
        rel_avg = round(sum(rel_scores) / n, 2)
        comp_avg = round(sum(comp_scores) / n, 2)
        prob_avg = round(sum(prob_scores) / n, 2)
        comm_avg = round(sum(comm_scores) / n, 2)

        # Overall scaled to 0 - 100
        overall_scaled = round(((tech_avg + rel_avg + comp_avg + prob_avg + comm_avg) / 25.0) * 100.0, 1)

        # Collect missing concepts
        all_missing = []
        for e in evaluations:
            all_missing.extend(e.get("missing_concepts", []))
        unique_missing = list(set(all_missing))[:6]

        # Extract strengths & weaknesses from high and low scoring turns
        strengths = []
        weaknesses = []

        if tech_avg >= 3.5:
            strengths.append(f"Solid domain knowledge for {target_role} across core technical questions.")
        else:
            weaknesses.append("Deepen technical architecture answers with specific algorithms, metrics, and implementations.")

        if comm_avg >= 3.5:
            strengths.append("High clarity and structure in vocal delivery and response pacing.")
        else:
            weaknesses.append("Focus on structured storytelling (Situation, Task, Action, Result) to avoid rambling.")

        if rel_avg >= 3.8:
            strengths.append("High contextual relevance; answers directly addressed interviewer intent.")

        if comp_avg < 3.2 and unique_missing:
            weaknesses.append(f"Incomplete coverage on critical topics: {', '.join(unique_missing[:3])}.")

        if not strengths:
            strengths.append("Good effort demonstrating foundational familiarity with the topic.")

        revision_topics = unique_missing if unique_missing else [f"Advanced {target_role} design patterns", "Production incident debugging"]
        practice_exercises = [
            f"Review trade-offs for {t} and practice explaining them aloud in under 90 seconds."
            for t in revision_topics[:3]
        ]

        summary = (
            f"Candidate achieved an overall mock performance score of {overall_scaled}/100 for the {target_role} track. "
            f"Demonstrated strongest competency in "
            f"{'Technical Correctness' if tech_avg >= comm_avg else 'Communication Clarity'}. "
            f"Key opportunity area is bolstering depth in {revision_topics[0] if revision_topics else 'system design'}."
        )

        return {
            "overall_score": overall_scaled,
            "technical_avg": tech_avg,
            "relevance_avg": rel_avg,
            "completeness_avg": comp_avg,
            "problem_solving_avg": prob_avg,
            "communication_avg": comm_avg,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "missing_concepts": unique_missing,
            "revision_topics": revision_topics,
            "practice_exercises": practice_exercises,
            "summary": summary
        }

    def generate_pdf_report(self, session_id: str, report_data: Dict[str, Any], output_path: str):
        from app.services.pdf_generator import generate_styled_pdf_report
        return generate_styled_pdf_report(session_id, report_data, output_path)

    def _old_generate_pdf_report(self, session_id: str, report_data: Dict[str, Any], output_path: str):
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        c = canvas.Canvas(output_path, pagesize=letter)
        width, height = letter

        # Header
        c.setFillColor(colors.HexColor("#0f172a")) # Dark navy
        c.rect(0, height - 80, width, 80, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 20)
        c.drawString(40, height - 48, "Adaptive AI Mock Interview Report")

        c.setFont("Helvetica", 10)
        c.drawString(40, height - 68, f"Session ID: {session_id} | Target Role: {report_data.get('target_role', 'Engineering')}")

        # Overall Score Box
        c.setFillColor(colors.HexColor("#f8fafc"))
        c.roundRect(40, height - 170, 530, 75, 8, fill=1, stroke=1)

        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(60, height - 120, "Overall Performance Score")

        score_val = f"{report_data.get('overall_score', 0)} / 100"
        c.setFillColor(colors.HexColor("#2563eb")) # Blue
        c.setFont("Helvetica-Bold", 24)
        c.drawString(60, height - 150, score_val)

        # Dimension Breakdown
        c.setFillColor(colors.HexColor("#0f172a"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, height - 200, "Core Competency Scores (0 to 5 Scale)")

        dims = [
            ("Technical Correctness", report_data.get("technical_avg", 0)),
            ("Relevance", report_data.get("relevance_avg", 0)),
            ("Completeness", report_data.get("completeness_avg", 0)),
            ("Problem Solving", report_data.get("problem_solving_avg", 0)),
            ("Communication Clarity", report_data.get("communication_avg", 0)),
        ]

        y_offset = height - 225
        for dim_name, score in dims:
            c.setFont("Helvetica", 10)
            c.setFillColor(colors.HexColor("#334155"))
            c.drawString(60, y_offset, f"{dim_name}:")
            c.setFont("Helvetica-Bold", 10)
            c.drawString(240, y_offset, f"{score} / 5.0")
            y_offset -= 18

        # Strengths & Weaknesses
        y_offset -= 10
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawString(40, y_offset, "Key Strengths:")
        y_offset -= 18
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#1e293b"))
        for s in report_data.get("strengths", [])[:3]:
            c.drawString(60, y_offset, f"- {s}")
            y_offset -= 15

        y_offset -= 8
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawString(40, y_offset, "Areas for Improvement:")
        y_offset -= 18
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#1e293b"))
        for w in report_data.get("weaknesses", [])[:3]:
            c.drawString(60, y_offset, f"- {w}")
            y_offset -= 15

        # Recommended Practice
        y_offset -= 8
        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawString(40, y_offset, "Targeted Practice Exercises:")
        y_offset -= 18
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#1e293b"))
        for ex in report_data.get("practice_exercises", [])[:2]:
            c.drawString(60, y_offset, f"- {ex[:90]}")
            y_offset -= 15

        # Footer Disclaimer
        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(40, 30, "Disclaimer: AI-generated scores are estimates intended for practice, not definitive assessments of employability.")

        c.save()
        return output_path

feedback_coach = FeedbackCoachingAgent()
