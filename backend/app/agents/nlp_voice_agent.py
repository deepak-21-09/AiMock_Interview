from typing import Dict, Any, List, Optional
from nlp_service.inference import nlp_agent_engine

class NLPVoiceAgentWrapper:
    """
    Wrapper connecting Orchestrator to the internal NLP Voice-Interaction Pipeline.
    Evaluates candidate intent, semantic relevance, and concept coverage.
    """

    def analyze_turn(
        self,
        question: str,
        interview_round: str,
        transcript: str,
        expected_concepts: List[str],
        confidence: float = 1.0
    ) -> Dict[str, Any]:
        return nlp_agent_engine.analyze(
            question=question,
            interview_round=interview_round,
            transcript=transcript,
            expected_concepts=expected_concepts,
            transcript_confidence=confidence
        )

nlp_voice_agent = NLPVoiceAgentWrapper()
