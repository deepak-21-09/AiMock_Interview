import json
import uuid
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from app.core.config import settings

class InterviewPlannerAgent:
    """
    Generates tailored, non-repetitive interview plans spanning technical,
    behavioral, situational, and HR rounds based on resume details and target JD.
    """

    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    def _generate_fallback_plan(
        self,
        target_role: str,
        skills: List[str],
        projects: List[Dict[str, Any]],
        rounds: List[str],
        num_questions: int,
        starting_diff: int
    ) -> List[Dict[str, Any]]:
        pool = []
        asked_texts = set()

        def add_q(round_type: str, text: str, diff: int, competency: str, concepts: List[str], source: str):
            if text not in asked_texts:
                asked_texts.add(text)
                pool.append({
                    "round": round_type,
                    "text": text,
                    "diff": diff,
                    "competency": competency,
                    "concepts": concepts,
                    "source": source
                })

        # Project-specific questions
        for idx, p in enumerate(projects[:3]):
            p_name = p.get("name", f"Project {idx+1}")
            p_techs = p.get("technologies", [])
            tech_mention = p_techs[0] if p_techs else "your core technology stack"
            add_q(
                "technical",
                f"In your project '{p_name}', what major architectural trade-offs did you make, and how did you leverage {tech_mention} to maintain low latency and high availability under peak load?",
                starting_diff,
                "Technical Architecture & System Design",
                [tech_mention, "Architecture", "Trade-offs", "Scalability"],
                f"Resume Project: {p_name}"
            )

        # Skill-specific technical questions
        for idx, s in enumerate(skills[:8]):
            diff_level = min(5, max(1, starting_diff + (idx % 3 - 1)))
            add_q(
                "technical",
                f"When designing scalable backend systems utilizing {s}, how do you approach performance optimization, concurrency, and failure recovery?",
                diff_level,
                f"Deep Dive: {s}",
                [s, "Concurrency", "Optimization", "Failure Recovery"],
                f"Resume Skill: {s}"
            )
            add_q(
                "technical",
                f"Can you explain a complex bug or performance bottleneck you encountered while working with {s}, and the methodology you used to diagnose and resolve it?",
                diff_level,
                f"Troubleshooting & Debugging: {s}",
                [s, "Root Cause Analysis", "Profiling", "Resolution"],
                f"Resume Skill: {s}"
            )

        # General technical questions
        add_q(
            "technical",
            "How do you approach automated testing and continuous integration in a distributed microservices environment to ensure zero-downtime releases?",
            starting_diff,
            "DevOps, CI/CD & Reliability",
            ["CI/CD", "Automated Testing", "Zero Downtime", "Canary Deployment"],
            "Software Reliability Principles"
        )
        add_q(
            "technical",
            "Walk me through your strategy for database indexing, query optimization, and transaction isolation when scaling a relational database to millions of rows.",
            min(5, starting_diff + 1),
            "Database Scalability & Performance",
            ["Indexes", "Query Optimization", "Transaction Isolation", "Connection Pooling"],
            "Database Engineering"
        )

        # Behavioral questions
        add_q(
            "behavioral",
            "Describe a challenging situation where you faced conflicting technical priorities or a tight product deadline. How did you negotiate scope, align stakeholders, and deliver?",
            3,
            "Stakeholder Negotiation & Prioritization",
            ["Prioritization", "Scope Negotiation", "Clear Communication", "Delivery"],
            "Behavioral Evaluation (STAR)"
        )
        add_q(
            "behavioral",
            "Tell me about a time when you strongly disagreed with a team member or technical lead regarding an architectural decision. How did you articulate your perspective and reach consensus?",
            3,
            "Technical Conflict & Consensus Building",
            ["Technical Communication", "Empathy", "Data-driven Consensus", "Collaboration"],
            "Team Dynamics"
        )
        add_q(
            "behavioral",
            "Can you share an experience where a project or release did not go as planned? What went wrong, how did you communicate with leadership, and what did you learn?",
            3,
            "Accountability & Growth Mindset",
            ["Accountability", "Post-mortem", "Resilience", "Continuous Improvement"],
            "Leadership & Resilience"
        )

        # Situational questions
        add_q(
            "situational",
            f"Suppose a mission-critical production service for {target_role} experiences a sudden 5x latency surge and database connection pool exhaustion. Walk me through your step-by-step triage and incident mitigation process.",
            min(5, starting_diff + 1),
            "Production Incident Management",
            ["Triage", "Telemetry/Logs", "Mitigation", "Root Cause Analysis"],
            f"Role Scenario: {target_role}"
        )
        add_q(
            "situational",
            f"Imagine you are assigned to refactor a legacy monolithic application for {target_role} with zero test coverage and active users. What is your incremental migration roadmap to prevent regression?",
            starting_diff,
            "Legacy Modernization & Architecture",
            ["Strangler Fig Pattern", "Test Harness", "Incremental Migration", "Risk Mitigation"],
            "System Modernization"
        )

        # HR & Cultural Alignment questions
        add_q(
            "hr",
            f"What specifically motivates you to pursue this {target_role} position at this point in your career, and what engineering values matter most to you in your daily work?",
            2,
            "Career Alignment & Core Motivation",
            ["Career Goals", "Engineering Values", "Motivation"],
            "HR Alignment"
        )
        add_q(
            "hr",
            "How do you keep your technical skills current in the rapidly evolving technology landscape, and how do you share knowledge or mentor teammates?",
            2,
            "Continuous Learning & Mentorship",
            ["Continuous Learning", "Knowledge Sharing", "Mentorship"],
            "Team Culture"
        )

        # Filter according to selected rounds
        selected = [q for q in pool if q["round"] in rounds]
        # If rounds filter is too restrictive, include top items from pool
        if len(selected) < num_questions:
            remaining = [q for q in pool if q not in selected]
            selected.extend(remaining[:num_questions - len(selected)])

        selected = selected[:num_questions]

        plan_items = []
        for idx, item in enumerate(selected):
            plan_items.append({
                "id": str(uuid.uuid4()),
                "order_index": idx + 1,
                "round_type": item["round"],
                "difficulty": item["diff"],
                "question_text": item["text"],
                "competency_focus": item["competency"],
                "expected_concepts": item["concepts"],
                "source_reference": item["source"]
            })

        return plan_items

    def generate_plan(
        self,
        target_role: str,
        job_description: Optional[str],
        skills: List[str],
        projects: List[Dict[str, Any]],
        rounds: List[str],
        num_questions: int,
        starting_diff: int = 3
    ) -> List[Dict[str, Any]]:
        if not self.client:
            return self._generate_fallback_plan(target_role, skills, projects, rounds, num_questions, starting_diff)

        prompt = f"""You are an Expert AI Interview Planner.
Generate a structured, non-repetitive interview plan for a candidate applying for the role of '{target_role}'.
Job Description: {job_description or 'Standard expectations for ' + target_role}
Candidate Extracted Skills: {', '.join(skills[:10]) if skills else 'General Software Engineering'}
Candidate Projects: {[p.get('name') for p in projects[:3]]}
Interview Rounds to include: {', '.join(rounds)}
Total Questions required: {num_questions}
Starting Difficulty: {starting_diff} (scale 1 to 5)

Output strict JSON with a list of questions, each having:
- order_index: int (1 to {num_questions})
- round_type: one of [{', '.join(rounds)}]
- difficulty: int (1 to 5)
- question_text: personalized question string referencing projects/skills where appropriate
- competency_focus: competency being tested
- expected_concepts: list of 3-5 strings representing key concepts the candidate should mention
- source_reference: reference to resume project or job description requirement

JSON format:
{{"questions": [...]}}
"""
        try:
            response = self.client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                response_format={"type": "json_object"}
            )
            data = json.loads(response.choices[0].message.content)
            questions = data.get("questions", [])
            for q in questions:
                if "id" not in q:
                    q["id"] = str(uuid.uuid4())
            if len(questions) >= num_questions:
                return questions[:num_questions]
            else:
                return self._generate_fallback_plan(target_role, skills, projects, rounds, num_questions, starting_diff)
        except Exception:
            return self._generate_fallback_plan(target_role, skills, projects, rounds, num_questions, starting_diff)

interview_planner = InterviewPlannerAgent()
