from fastapi import APIRouter
from app.schemas.nlp import NLPAnalyzeRequest, NLPAnalyzeResponse, DetectedConceptSchema
from nlp_service.inference import nlp_agent_engine

router = APIRouter()

@router.post("/nlp/analyze", response_model=NLPAnalyzeResponse)
async def analyze_transcript(payload: NLPAnalyzeRequest):
    result = nlp_agent_engine.analyze(
        question=payload.current_question,
        interview_round=payload.interview_round,
        transcript=payload.candidate_transcript,
        expected_concepts=payload.expected_concepts,
        transcript_confidence=payload.transcript_confidence or 1.0
    )

    detected_schemas = [
        DetectedConceptSchema(
            concept=c["concept"],
            status=c["status"],
            confidence=c.get("confidence", 1.0)
        )
        for c in result.get("detected_concepts", [])
    ]

    return NLPAnalyzeResponse(
        intent=result["intent"],
        intent_confidence=result["intent_confidence"],
        relevance_label=result["relevance_label"],
        relevance_score=result["relevance_score"],
        detected_concepts=detected_schemas,
        transcript_quality_flag=result["transcript_quality_flag"],
        model_version=result["model_version"],
        used_fallback=result["used_fallback"]
    )
