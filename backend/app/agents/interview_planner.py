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
        questions = []
        lead_skill = skills[0] if skills else "System Architecture"
        second_skill = skills[1] if len(skills) > 1 else "Database Design"
        lead_project = projects[0]["name"] if projects else "Your flagship engineering project"

        pool = [
            {
                "round": "technical",
                "text": f"In your project '{lead_project}', what trade-offs influenced your architectural design, and how did you utilize {lead_skill} to maintain performance under load?",
                "diff": starting_diff,
                "competency": "Technical Architecture & Design",
                "concepts": [lead_skill, "Trade-offs", "Scalability", "Bottlenecks"],
                "source": f"Resume Project: {lead_project}"
            },
            {
                "round": "technical",
                "text": f"When implementing data persistence with {second_skill}, how did you ensure data consistency, indexing efficiency, and fault tolerance?",
                "diff": starting_diff,
                "competency": "Data Engineering & Reliability",
                "concepts": [second_skill, "Indexes", "ACID Transactions", "Concurrency"],
                "source": f"Resume Skill: {second_skill}"
            },
            {
                "round": "behavioral",
                "text": "Describe a scenario where you faced conflicting technical priorities or tight deadlines with product stakeholders. How did you negotiate scope and deliver?",
                "diff": 3,
                "competency": "Stakeholder Communication & Prioritization",
                "concepts": ["Prioritization", "Trade-offs", "Clear Communication", "Resolution"],
                "source": "Behavioral Evaluation"
            },
            {
                "round": "situational",
                "text": f"Suppose your production service for {target_role} suddenly experiences a 5x surge in latency and 500 error spikes. Walk me through your step-by-step triage and incident response.",
                "diff": min(5, starting_diff + 1),
                "competency": "Incident Management & Problem Solving",
                "concepts": ["Root Cause Analysis", "Observability/Logs", "Rollback/Mitigation", "Post-mortem"],
                "source": f"Role Scenario: {target_role}"
            },
            {
                "round": "hr",
                "text": f"What motivates you to pursue this {target_role} role at this stage of your career, and how do your technical aspirations align with our engineering culture?",
                "diff": 2,
                "competency": "Culture Fit & Career Alignment",
                "concepts": ["Career Progression", "Cultural Alignment", "Core Values"],
                "source": "HR Alignment"
            }
        ]

        # Filter according to selected rounds and truncate to num_questions
        selected = [q for q in pool if q["round"] in rounds]
        if len(selected) < num_questions:
            # Add general technical design questions
            selected.append({
                "round": "technical",
                "text": "How do you approach writing clean, maintainable, and testable code in distributed systems, and what CI/CD practices do you consider essential?",
                "diff": starting_diff,
                "competency": "Code Quality & DevOps",
                "concepts": ["Unit Testing", "CI/CD", "Modularity", "Code Review"],
                "source": "Software Engineering Principles"
            })

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
            return questions[:num_questions]
        except Exception:
            # Reliable fallback
            return self._generate_fallback_plan(target_role, skills, projects, rounds, num_questions, starting_diff)

interview_planner = InterviewPlannerAgent()
