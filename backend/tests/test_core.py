import pytest
from app.agents.resume_analysis import resume_analyzer
from app.agents.interview_planner import interview_planner
from app.agents.interviewer import interviewer_agent
from app.agents.answer_evaluator import answer_evaluator
from app.agents.feedback_coaching import feedback_coach
from nlp_service.inference import nlp_agent_engine

def test_nlp_intent_classification():
    # Test repeat request
    res = nlp_agent_engine.analyze(
        question="What is database normalization?",
        interview_round="technical",
        transcript="Could you please repeat that question?",
        expected_concepts=["1NF", "2NF", "3NF"]
    )
    assert res["intent"] == "repeat_request"
    assert res["relevance_label"] in ["relevant", "partially_relevant"]

    # Test clarification request
    res2 = nlp_agent_engine.analyze(
        question="How do you handle microservice failures?",
        interview_round="technical",
        transcript="Could you clarify if you mean network timeouts or cascading failures?",
        expected_concepts=["Circuit breaker", "Retry", "Fallback"]
    )
    assert res2["intent"] == "clarification_request"

    # Test answer with concept detection
    res3 = nlp_agent_engine.analyze(
        question="How do you cache high traffic endpoints?",
        interview_round="technical",
        transcript="We implemented Redis caching with a cache-aside pattern and TTL invalidation.",
        expected_concepts=["Redis", "TTL", "Cache-aside"]
    )
    assert res3["intent"] == "answer"
    detected = {c["concept"]: c["status"] for c in res3["detected_concepts"]}
    assert detected.get("Redis") == "present"
    assert detected.get("TTL") == "present"

def test_resume_analysis_and_matching():
    skills = resume_analyzer.extract_skills("Experienced in Python, PostgreSQL, React, and Docker.")
    assert "Python" in skills
    assert "PostgreSQL" in skills
    assert "React" in skills

    match = resume_analyzer.calculate_job_match(skills, "Looking for Python and PostgreSQL developer with AWS.")
    assert "Python" in match["matched_skills"]
    assert "AWS" in match["missing_skills"]
    assert match["match_percentage"] > 0

def test_interview_planner_generation():
    plan = interview_planner.generate_plan(
        target_role="Full Stack Engineer",
        job_description="React and Python role",
        skills=["Python", "React", "SQL"],
        projects=[{"name": "E-Commerce App", "technologies": ["Python", "React"]}],
        rounds=["technical", "behavioral", "situational", "hr"],
        num_questions=4,
        starting_diff=3
    )
    assert len(plan) == 4
    for q in plan:
        assert "question_text" in q
        assert 1 <= q["difficulty"] <= 5
        assert "expected_concepts" in q

def test_answer_evaluator_rubric():
    nlp_res = {
        "relevance_label": "relevant",
        "detected_concepts": [{"concept": "Redis", "status": "present"}]
    }
    eval_res = answer_evaluator.evaluate_answer(
        question="How do you optimize slow queries?",
        transcript="We added database indexing on foreign keys and cached frequent lookups in Redis.",
        expected_concepts=["Indexes", "Redis"],
        nlp_analysis=nlp_res
    )
    assert 0 <= eval_res["technical_score"] <= 5
    assert 0 <= eval_res["relevance_score"] <= 5
    assert 0 <= eval_res["completeness_score"] <= 5
    assert 0 <= eval_res["problem_solving_score"] <= 5
    assert 0 <= eval_res["communication_score"] <= 5
    assert len(eval_res["evidence_quotes"]) > 0

def test_feedback_synthesis():
    evals = [
        {
            "technical_score": 4,
            "relevance_score": 5,
            "completeness_score": 4,
            "problem_solving_score": 4,
            "communication_score": 5,
            "missing_concepts": ["Distributed Locks"]
        }
    ]
    report = feedback_coach.synthesize_report(
        target_role="Backend Developer",
        evaluations=evals,
        questions=[]
    )
    assert report["overall_score"] >= 80.0
    assert len(report["strengths"]) > 0
    assert "Distributed Locks" in report["missing_concepts"]
