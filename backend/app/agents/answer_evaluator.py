import json
from typing import Dict, Any, List, Optional
from openai import OpenAI
from app.core.config import settings

class AnswerEvaluationAgent:
    """
    Evaluates candidate spoken responses against the documented 5-dimension rubric.
    Enforces evidence quotes and flags insufficient evidence.
    """

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    def _rule_based_fallback_eval(
        self,
        question: str,
        transcript: str,
        expected_concepts: List[str],
        nlp_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        words = transcript.strip().split()
        num_words = len(words)
        
        detected_concepts = nlp_analysis.get("detected_concepts", [])
        present_concepts = [c["concept"] for c in detected_concepts if c.get("status") == "present"]
        missing_concepts = [c["concept"] for c in detected_concepts if c.get("status") == "absent"]

        relevance_label = nlp_analysis.get("relevance_label", "relevant")

        # Baseline dimension heuristics
        if relevance_label == "irrelevant":
            rel_score = 1
            tech_score = 1
            comp_score = 1
            prob_score = 1
            comm_score = 2
        elif relevance_label == "partially_relevant":
            rel_score = 3
            tech_score = 3
            comp_score = 2
            prob_score = 3
            comm_score = 3
        else:
            rel_score = 4 if num_words > 15 else 3
            tech_score = min(5, 3 + len(present_concepts))
            comp_score = 4 if len(missing_concepts) <= 1 and num_words > 30 else 3
            prob_score = 4 if "because" in transcript.lower() or "reduced" in transcript.lower() or "implemented" in transcript.lower() else 3
            comm_score = 4 if num_words > 20 else 3

        # Exact evidence quote extraction
        sentences = [s.strip() for s in transcript.split(".") if len(s.strip()) > 8]
        quotes = sentences[:2] if sentences else ([transcript[:80]] if transcript else [])

        overall = round((tech_score + rel_score + comp_score + prob_score + comm_score) / 5.0, 2)

        return {
            "technical_score": tech_score,
            "relevance_score": rel_score,
            "completeness_score": comp_score,
            "problem_solving_score": prob_score,
            "communication_score": comm_score,
            "overall_answer_score": overall,
            "justifications": {
                "technical": f"Demonstrated grasp of {', '.join(present_concepts) if present_concepts else 'fundamental technical concepts'}.",
                "relevance": f"The response was {relevance_label} to the question prompt.",
                "completeness": f"Covered {len(present_concepts)} concepts, with {len(missing_concepts)} areas requiring further depth.",
                "problem_solving": "Articulated logical reasoning and practical decision-making.",
                "communication": "Structured thoughts clearly and responded concisely."
            },
            "evidence_quotes": quotes,
            "missing_concepts": missing_concepts,
            "unsupported_claims": [],
            "insufficient_evidence": False,
            "evaluator_model": "rule-based-calibrated-v1"
        }

    def evaluate_answer(
        self,
        question: str,
        transcript: str,
        expected_concepts: List[str],
        nlp_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        if not transcript or len(transcript.strip().split()) < 3:
            return {
                "technical_score": 0,
                "relevance_score": 0,
                "completeness_score": 0,
                "problem_solving_score": 0,
                "communication_score": 0,
                "overall_answer_score": 0.0,
                "justifications": {dim: "No audible or decipherable response provided." for dim in ["technical", "relevance", "completeness", "problem_solving", "communication"]},
                "evidence_quotes": [],
                "missing_concepts": expected_concepts,
                "unsupported_claims": [],
                "insufficient_evidence": True,
                "evaluator_model": "insufficient-evidence-checker"
            }

        if not self.client:
            return self._rule_based_fallback_eval(question, transcript, expected_concepts, nlp_analysis)

        detected_concepts = nlp_analysis.get("detected_concepts", [])
        prompt = f"""You are an Objective Technical Interview Evaluator.
Question Asked: "{question}"
Expected Concepts: {json.dumps(expected_concepts)}
Candidate Spoken Transcript: "{transcript}"
NLP Pre-Analysis Detected Concepts: {json.dumps(detected_concepts)}

Evaluate the candidate's response strictly on these 5 dimensions (Integer score 0 to 5 each):
1. Technical correctness (0-5)
2. Relevance (0-5)
3. Completeness (0-5)
4. Problem-solving (0-5)
5. Communication clarity (0-5)

RULES:
- Provide an exact quote from the transcript as evidence for each score.
- If no evidence exists in the transcript for a score, flag insufficient_evidence as true.
- List any missing expected concepts.
- Do not infer emotion, personality, or employability.

Respond in strict JSON:
{{
  "technical_score": int,
  "relevance_score": int,
  "completeness_score": int,
  "problem_solving_score": int,
  "communication_score": int,
  "justifications": {{
    "technical": str,
    "relevance": str,
    "completeness": str,
    "problem_solving": str,
    "communication": str
  }},
  "evidence_quotes": [list of strings directly from transcript],
  "missing_concepts": [list of strings],
  "unsupported_claims": [list of strings],
  "insufficient_evidence": false
}}
"""
        try:
            res = self.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            data = json.loads(res.choices[0].message.content)
            scores = [
                data.get("technical_score", 3),
                data.get("relevance_score", 3),
                data.get("completeness_score", 3),
                data.get("problem_solving_score", 3),
                data.get("communication_score", 3),
            ]
            data["overall_answer_score"] = round(sum(scores) / 5.0, 2)
            data["evaluator_model"] = settings.LLM_MODEL
            return data
        except Exception:
            return self._rule_based_fallback_eval(question, transcript, expected_concepts, nlp_analysis)

answer_evaluator = AnswerEvaluationAgent()
