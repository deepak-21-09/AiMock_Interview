import json
from typing import Dict, Any, Optional, List
from openai import OpenAI
from app.core.config import settings

class InterviewerAgent:
    """
    Manages conversational delivery:
    - Provides smooth transitions across rounds.
    - Handles repeat prompts.
    - Generates context-aware clarifications and follow-up probes.
    """

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    def explain_clarification(self, question_text: str, round_type: str) -> str:
        return (
            f"Certainly! In this {round_type} question, I'm asking you to focus specifically on: "
            f"'{question_text}'. Feel free to outline your high-level thought process, "
            f"the key technical decisions or principles involved, and any practical trade-offs you encountered."
        )

    def generate_follow_up(
        self,
        parent_question: str,
        candidate_transcript: str,
        missing_concepts: List[str],
        current_diff: int
    ) -> str:
        if not missing_concepts:
            missing_concepts = ["specific trade-offs", "operational edge cases"]

        missed_str = ", ".join(missing_concepts[:2])
        if not self.client:
            return (
                f"You touched on some solid points. Could you delve a bit deeper into how you handled {missed_str} "
                f"specifically in that situation?"
            )

        prompt = f"""You are a professional AI interviewer.
The candidate was asked: "{parent_question}"
They gave this answer: "{candidate_transcript}"
Key concepts they missed or didn't elaborate on: {missed_str}

Generate a concise, natural, professional follow-up question (1-2 sentences) encouraging them to explain these missing points without being hostile.
"""
        try:
            res = self.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=100
            )
            return res.choices[0].message.content.strip()
        except Exception:
            return f"Understood. Could you elaborate specifically on {missed_str} and the trade-offs you considered?"

interviewer_agent = InterviewerAgent()
