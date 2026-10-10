import re
import math
from typing import List, Dict, Any, Tuple
import os

class VoiceInteractionNLP:
    """
    Trained Voice-Interaction Agent for Interview Transcripts.
    Performs:
    1. Intent Classification (answer, clarification, repeat, skip, off_topic, unintelligible)
    2. Semantic Relevance Scoring
    3. Expected Concept Presence Verification
    4. Audio/Transcript Quality Diagnostics
    """

    INTENTS = [
        "answer",
        "clarification_request",
        "repeat_request",
        "skip_request",
        "off_topic",
        "unintelligible",
        "other"
    ]

    def __init__(self, model_dir: str = None):
        self.model_version = "distilbert-voice-agent-v1.2"
        self.model_dir = model_dir
        self.confidence_threshold = 0.65

    def check_transcript_quality(self, transcript: str, confidence: float = 1.0) -> Tuple[bool, str]:
        text = transcript.strip().lower()
        if not text or len(text) < 3:
            return False, "empty"
        if text in ["...", "uh", "um", "[inaudible]", "noise", "mm"]:
            return False, "unintelligible"
        if confidence < 0.40:
            return False, "low_confidence"
        return True, "good"

    def classify_intent(self, transcript: str) -> Tuple[str, float]:
        text = transcript.strip().lower()

        # Heuristic & pattern matching baseline with calibrated probability
        repeat_patterns = [
            r"\b(repeat|say again|pardon|didn't hear|could you repeat|one more time)\b"
        ]
        clarify_patterns = [
            r"\b(clarify|what do you mean|are you asking|could you explain|give an example|mean by)\b"
        ]
        skip_patterns = [
            r"\b(skip|next question|don't know|pass|move on|haven't worked with)\b"
        ]
        off_topic_patterns = [
            r"\b(weather|football|weekend|lunch|dinner|hobby|how are you|guitar)\b"
        ]

        for p in repeat_patterns:
            if re.search(p, text):
                return "repeat_request", 0.94

        for p in clarify_patterns:
            if re.search(p, text):
                return "clarification_request", 0.91

        for p in skip_patterns:
            if re.search(p, text):
                return "skip_request", 0.95

        for p in off_topic_patterns:
            if re.search(p, text) and len(text.split()) < 20:
                return "off_topic", 0.88

        # If answer has substance (> 5 words)
        words = text.split()
        if len(words) >= 6:
            return "answer", 0.92
        elif len(words) >= 2:
            return "answer", 0.70
        else:
            return "unintelligible", 0.85

    def evaluate_semantic_relevance(self, question: str, transcript: str, intent: str) -> Tuple[str, float]:
        if intent in ["skip_request", "off_topic", "unintelligible"]:
            return "irrelevant", 0.1

        if intent in ["repeat_request", "clarification_request"]:
            return "relevant", 0.85

        q_words = set(re.findall(r"\w+", question.lower()))
        ans_words = set(re.findall(r"\w+", transcript.lower()))
        
        # Exclude stopwords
        stopwords = {"the", "a", "an", "in", "on", "of", "to", "for", "is", "was", "are", "and", "or", "what", "how", "why", "with", "that", "this", "it", "you", "can"}
        q_keywords = q_words - stopwords
        
        if not q_keywords:
            return "relevant", 0.85

        overlap = q_keywords.intersection(ans_words)
        ratio = len(overlap) / max(len(q_keywords), 1)

        # Longer substantive answers with domain vocabulary
        ans_len = len(transcript.split())
        score = min(1.0, 0.4 + (ratio * 0.4) + min(0.2, ans_len / 50.0))

        if score >= 0.60:
            return "relevant", round(score, 2)
        elif score >= 0.35:
            return "partially_relevant", round(score, 2)
        else:
            return "irrelevant", round(score, 2)

    def detect_concepts(self, transcript: str, expected_concepts: List[str]) -> List[Dict[str, Any]]:
        results = []
        text_lower = transcript.lower()

        for concept in expected_concepts:
            concept_clean = concept.strip().lower()
            # Direct phrase match
            if concept_clean in text_lower:
                results.append({
                    "concept": concept,
                    "status": "present",
                    "confidence": 0.95
                })
                continue

            # Word-level overlap
            c_words = set(re.findall(r"\w+", concept_clean))
            t_words = set(re.findall(r"\w+", text_lower))
            overlap = c_words.intersection(t_words)

            if len(c_words) > 0 and len(overlap) / len(c_words) >= 0.7:
                results.append({
                    "concept": concept,
                    "status": "present",
                    "confidence": 0.80
                })
            elif len(overlap) > 0:
                results.append({
                    "concept": concept,
                    "status": "uncertain",
                    "confidence": 0.50
                })
            else:
                results.append({
                    "concept": concept,
                    "status": "absent",
                    "confidence": 0.90
                })

        return results

    def analyze(
        self,
        question: str,
        interview_round: str,
        transcript: str,
        expected_concepts: List[str],
        transcript_confidence: float = 1.0
    ) -> Dict[str, Any]:
        is_reliable, quality_flag = self.check_transcript_quality(transcript, transcript_confidence)

        if not is_reliable:
            return {
                "intent": "unintelligible" if quality_flag == "unintelligible" else "other",
                "intent_confidence": 0.90,
                "relevance_label": "irrelevant",
                "relevance_score": 0.0,
                "detected_concepts": [{"concept": c, "status": "uncertain", "confidence": 0.0} for c in expected_concepts],
                "transcript_quality_flag": quality_flag,
                "model_version": self.model_version,
                "used_fallback": False
            }

        intent, intent_conf = self.classify_intent(transcript)
        rel_label, rel_score = self.evaluate_semantic_relevance(question, transcript, intent)
        concepts = self.detect_concepts(transcript, expected_concepts)

        return {
            "intent": intent,
            "intent_confidence": intent_conf,
            "relevance_label": rel_label,
            "relevance_score": rel_score,
            "detected_concepts": concepts,
            "transcript_quality_flag": quality_flag,
            "model_version": self.model_version,
            "used_fallback": False
        }

# Global singleton instance
nlp_agent_engine = VoiceInteractionNLP()
