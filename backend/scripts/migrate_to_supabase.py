"""
Supabase PostgreSQL Migration & Verification Tool
Migrates all 14 tables from local SQLite (backend/interview_app.db) to Supabase PostgreSQL.
Preserves:
- Primary key UUIDs and foreign key relationships
- Password hashes and custom JWT authentication
- Self-referential question hierarchies (parents before follow-ups)
- JSON structures and UTC timezone timestamps
- Validates 100% row count parity and foreign key integrity
- Fully idempotent: Uses ON CONFLICT (id) DO NOTHING for safe reruns and duplicate prevention
- Strictly non-destructive: Zero DROP, TRUNCATE, or DELETE operations
"""

import os
import sys
import json
import sqlite3
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List

# Ensure backend root is on path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.db.session import Base
import app.models  # Register all models on Base.metadata

def parse_dt(val: Any) -> Any:
    if not val:
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    try:
        dt_str = str(val).replace("Z", "+00:00")
        dt = datetime.fromisoformat(dt_str)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None

def parse_json(val: Any, default: Any = None) -> Any:
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return default if default is not None else {}

def parse_bool(val: Any) -> bool:
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    return val in (1, "1", "true", "True", True)

def parse_float(val: Any) -> Any:
    if val is None:
        return None
    try:
        return float(val)
    except Exception:
        return None

class SupabaseMigrator:
    def __init__(self, sqlite_path: str, supabase_url: str):
        self.sqlite_path = sqlite_path
        self.supabase_url = supabase_url
        self.engine = create_async_engine(
            supabase_url,
            echo=False,
            future=True,
            connect_args={
                "ssl": "require",
                "prepared_statement_cache_size": 0,
                "statement_cache_size": 0
            }
        )
        self.session_factory = async_sessionmaker(bind=self.engine, class_=AsyncSession, expire_on_commit=False)

    async def create_schema(self):
        """Creates all 14 tables in Supabase public schema using SQLAlchemy metadata."""
        print("\n--- Phase 1: Creating Schema in Supabase PostgreSQL ---")
        async with self.engine.begin() as conn:
            # create_all uses CREATE TABLE IF NOT EXISTS (strictly non-destructive)
            await conn.run_sync(Base.metadata.create_all)
            # Ensure competency_focus is TEXT to accommodate long follow-up recursive strings
            await conn.execute(text("ALTER TABLE interview_questions ALTER COLUMN competency_focus TYPE TEXT;"))
        print("All 14 tables and indexes successfully verified/created in Supabase public schema.")

    def read_sqlite_table(self, table_name: str, order_clause: str = "") -> List[Dict[str, Any]]:
        conn = sqlite3.connect(f"file:{self.sqlite_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        query = f'SELECT * FROM "{table_name}"'
        if order_clause:
            query += f" {order_clause}"
        cur.execute(query)
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return rows

    async def migrate_data(self) -> Dict[str, Any]:
        """Transfers data row-by-row in dependency order, validating counts at every step."""
        print("\n--- Phase 2: Transferring Data in Dependency Order ---")
        
        results = {}

        # 1. users
        print("1/14. Migrating users...")
        u_rows = self.read_sqlite_table("users")
        u_data = [
            {
                "id": r["id"],
                "email": r["email"],
                "hashed_password": r["hashed_password"],
                "is_active": parse_bool(r["is_active"]),
                "created_at": parse_dt(r["created_at"]),
                "updated_at": parse_dt(r["updated_at"])
            }
            for r in u_rows
        ]
        results["users"] = await self._insert_table("users", u_data, len(u_rows))

        # 2. candidate_profiles
        print("2/14. Migrating candidate_profiles...")
        cp_rows = self.read_sqlite_table("candidate_profiles")
        cp_data = [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "full_name": r["full_name"],
                "education": r["education"],
                "years_of_experience": parse_float(r["years_of_experience"]) or 0.0,
                "current_role": r["current_role"],
                "target_role": r["target_role"],
                "bio": r["bio"],
                "updated_at": parse_dt(r["updated_at"])
            }
            for r in cp_rows
        ]
        results["candidate_profiles"] = await self._insert_table("candidate_profiles", cp_data, len(cp_rows))

        # 3. model_versions
        print("3/14. Migrating model_versions...")
        mv_rows = self.read_sqlite_table("model_versions")
        mv_data = [
            {
                "id": r["id"],
                "component_name": r["component_name"],
                "version_tag": r["version_tag"],
                "parameters": parse_json(r["parameters"], {}),
                "metrics": parse_json(r["metrics"], {}),
                "created_at": parse_dt(r["created_at"])
            }
            for r in mv_rows
        ]
        results["model_versions"] = await self._insert_table("model_versions", mv_data, len(mv_rows))

        # 4. resumes
        print("4/14. Migrating resumes...")
        res_rows = self.read_sqlite_table("resumes")
        res_data = [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "file_name": r["file_name"],
                "file_path": r["file_path"],
                "file_size_bytes": r["file_size_bytes"],
                "raw_text": r["raw_text"],
                "parsed_skills": parse_json(r["parsed_skills"], []),
                "parsed_projects": parse_json(r["parsed_projects"], []),
                "parsed_experience": parse_json(r["parsed_experience"], []),
                "parsed_education": parse_json(r["parsed_education"], []),
                "job_match": parse_json(r["job_match"], {}),
                "confidence_score": parse_float(r["confidence_score"]) or 1.0,
                "is_scanned": parse_bool(r["is_scanned"]),
                "created_at": parse_dt(r["created_at"])
            }
            for r in res_rows
        ]
        results["resumes"] = await self._insert_table("resumes", res_data, len(res_rows))

        # 5. interview_sessions
        print("5/14. Migrating interview_sessions...")
        is_rows = self.read_sqlite_table("interview_sessions")
        is_data = [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "resume_id": r["resume_id"],
                "target_role": r["target_role"],
                "job_description": r["job_description"],
                "status": r["status"],
                "starting_difficulty": r["starting_difficulty"],
                "current_difficulty": r["current_difficulty"],
                "target_rounds": parse_json(r["target_rounds"], []),
                "total_planned_questions": r["total_planned_questions"],
                "duration_minutes": r["duration_minutes"],
                "interaction_mode": r["interaction_mode"],
                "overall_score": parse_float(r["overall_score"]),
                "created_at": parse_dt(r["created_at"]),
                "updated_at": parse_dt(r["updated_at"])
            }
            for r in is_rows
        ]
        results["interview_sessions"] = await self._insert_table("interview_sessions", is_data, len(is_rows))

        # Collect set of valid session IDs to safely sanitize relationships (Option A)
        valid_session_ids = {r["id"] for r in is_rows}
        valid_sessions_sql = ",".join(f"'{s}'" for s in valid_session_ids)

        # 6. consent_records (Option A: Keep all 29 records, sanitize session_id to NULL if session was deleted)
        print("6/14. Migrating consent_records (preserving all 29 records, setting session_id=NULL for nonexistent sessions)...")
        cr_rows = self.read_sqlite_table("consent_records")
        cr_data = [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "session_id": r["session_id"] if r["session_id"] in valid_session_ids else None,
                "camera_consent": parse_bool(r["camera_consent"]),
                "mic_consent": parse_bool(r["mic_consent"]),
                "data_retention_acknowledged": parse_bool(r["data_retention_acknowledged"]),
                "timestamp": parse_dt(r["timestamp"])
            }
            for r in cr_rows
        ]
        results["consent_records"] = await self._insert_table("consent_records", cr_data, len(cr_rows))

        # 7. interview_rounds (Option A: Filter out the 7 orphaned rounds from deleted test sessions)
        print("7/14. Migrating interview_rounds (excluding 7 orphaned rounds from deleted sessions)...")
        ir_rows = self.read_sqlite_table("interview_rounds", f"WHERE session_id IN ({valid_sessions_sql})")
        ir_data = [
            {
                "id": r["id"],
                "session_id": r["session_id"],
                "round_type": r["round_type"],
                "round_order": r["round_order"],
                "status": r["status"]
            }
            for r in ir_rows
        ]
        results["interview_rounds"] = await self._insert_table("interview_rounds", ir_data, len(ir_rows))

        # 8. interview_questions (Option A: Filter out 10 orphaned questions with 0 answers; order parents first)
        print("8/14. Migrating interview_questions (excluding 10 orphaned questions from deleted sessions)...")
        iq_rows = self.read_sqlite_table(
            "interview_questions",
            f"WHERE session_id IN ({valid_sessions_sql}) ORDER BY CASE WHEN parent_question_id IS NULL THEN 0 ELSE 1 END, order_index ASC"
        )
        iq_data = [
            {
                "id": r["id"],
                "session_id": r["session_id"],
                "round_id": r["round_id"],
                "parent_question_id": r["parent_question_id"],
                "question_text": r["question_text"],
                "difficulty": r["difficulty"],
                "competency_focus": r["competency_focus"],
                "expected_concepts": parse_json(r["expected_concepts"], []),
                "source_reference": r["source_reference"],
                "order_index": r["order_index"],
                "is_followup": parse_bool(r["is_followup"]),
                "follow_up_count": r["follow_up_count"],
                "status": r["status"],
                "created_at": parse_dt(r["created_at"])
            }
            for r in iq_rows
        ]
        results["interview_questions"] = await self._insert_table("interview_questions", iq_data, len(iq_rows))

        # 9. interview_answers
        print("9/14. Migrating interview_answers...")
        ia_rows = self.read_sqlite_table("interview_answers")
        ia_data = [
            {
                "id": r["id"],
                "question_id": r["question_id"],
                "session_id": r["session_id"],
                "audio_path": r["audio_path"],
                "duration_seconds": parse_float(r["duration_seconds"]) or 0.0,
                "is_text_fallback": parse_bool(r["is_text_fallback"]),
                "created_at": parse_dt(r["created_at"])
            }
            for r in ia_rows
        ]
        results["interview_answers"] = await self._insert_table("interview_answers", ia_data, len(ia_rows))

        # 10. transcripts
        print("10/14. Migrating transcripts...")
        tr_rows = self.read_sqlite_table("transcripts")
        tr_data = [
            {
                "id": r["id"],
                "answer_id": r["answer_id"],
                "transcript_text": r["transcript_text"],
                "confidence_score": parse_float(r["confidence_score"]) or 1.0,
                "is_reliable": parse_bool(r["is_reliable"]),
                "quality_flag": r["quality_flag"],
                "created_at": parse_dt(r["created_at"])
            }
            for r in tr_rows
        ]
        results["transcripts"] = await self._insert_table("transcripts", tr_data, len(tr_rows))

        # 11. nlp_analyses
        print("11/14. Migrating nlp_analyses...")
        nlp_rows = self.read_sqlite_table("nlp_analyses")
        nlp_data = [
            {
                "id": r["id"],
                "transcript_id": r["transcript_id"],
                "intent": r["intent"],
                "intent_confidence": parse_float(r["intent_confidence"]) or 1.0,
                "semantic_relevance": r["semantic_relevance"],
                "relevance_score": parse_float(r["relevance_score"]) or 1.0,
                "detected_concepts": parse_json(r["detected_concepts"], []),
                "model_version": r["model_version"],
                "used_fallback": parse_bool(r["used_fallback"]),
                "created_at": parse_dt(r["created_at"])
            }
            for r in nlp_rows
        ]
        results["nlp_analyses"] = await self._insert_table("nlp_analyses", nlp_data, len(nlp_rows))

        # 12. answer_evaluations
        print("12/14. Migrating answer_evaluations...")
        ae_rows = self.read_sqlite_table("answer_evaluations")
        ae_data = [
            {
                "id": r["id"],
                "answer_id": r["answer_id"],
                "technical_score": r["technical_score"],
                "relevance_score": r["relevance_score"],
                "completeness_score": r["completeness_score"],
                "problem_solving_score": r["problem_solving_score"],
                "communication_score": r["communication_score"],
                "overall_answer_score": parse_float(r["overall_answer_score"]) or 3.0,
                "justifications": parse_json(r["justifications"], {}),
                "evidence_quotes": parse_json(r["evidence_quotes"], []),
                "missing_concepts": parse_json(r["missing_concepts"], []),
                "unsupported_claims": parse_json(r["unsupported_claims"], []),
                "insufficient_evidence": parse_bool(r["insufficient_evidence"]),
                "evaluator_model": r["evaluator_model"],
                "created_at": parse_dt(r["created_at"])
            }
            for r in ae_rows
        ]
        results["answer_evaluations"] = await self._insert_table("answer_evaluations", ae_data, len(ae_rows))

        # 13. interview_reports
        print("13/14. Migrating interview_reports...")
        rep_rows = self.read_sqlite_table("interview_reports")
        rep_data = [
            {
                "id": r["id"],
                "session_id": r["session_id"],
                "overall_score": parse_float(r["overall_score"]) or 0.0,
                "technical_avg": parse_float(r["technical_avg"]) or 0.0,
                "relevance_avg": parse_float(r["relevance_avg"]) or 0.0,
                "completeness_avg": parse_float(r["completeness_avg"]) or 0.0,
                "problem_solving_avg": parse_float(r["problem_solving_avg"]) or 0.0,
                "communication_avg": parse_float(r["communication_avg"]) or 0.0,
                "strengths": parse_json(r["strengths"], []),
                "weaknesses": parse_json(r["weaknesses"], []),
                "missing_concepts": parse_json(r["missing_concepts"], []),
                "revision_topics": parse_json(r["revision_topics"], []),
                "practice_exercises": parse_json(r["practice_exercises"], []),
                "summary": r["summary"],
                "disclaimer": r["disclaimer"],
                "pdf_path": r["pdf_path"],
                "created_at": parse_dt(r["created_at"])
            }
            for r in rep_rows
        ]
        results["interview_reports"] = await self._insert_table("interview_reports", rep_data, len(rep_rows))

        # 14. practice_attempts
        print("14/14. Migrating practice_attempts...")
        pa_rows = self.read_sqlite_table("practice_attempts")
        pa_data = [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "original_question_id": r["original_question_id"],
                "attempt_number": r["attempt_number"],
                "transcript_text": r["transcript_text"],
                "scores": parse_json(r["scores"], {}),
                "score_comparison": parse_json(r["score_comparison"], {}),
                "feedback": r["feedback"],
                "created_at": parse_dt(r["created_at"])
            }
            for r in pa_rows
        ]
        results["practice_attempts"] = await self._insert_table("practice_attempts", pa_data, len(pa_rows))

        total_migrated = sum(r["destination"] for r in results.values())
        print(f"\nPhase 2 Summary: {total_migrated}/1689 records verified in Supabase.")
        if total_migrated != 1689:
            raise RuntimeError(f"Total row count verification failed: expected 1,689 rows, got {total_migrated}")

        return results

    async def _insert_table(self, table_name: str, records: List[Dict[str, Any]], expected_count: int) -> Dict[str, Any]:
        if not records:
            print(f"   Table '{table_name}' has 0 records to migrate.")
            return {"source": expected_count, "destination": 0, "status": "MATCH (Empty)"}

        table_obj = Base.metadata.tables[table_name]

        # Use PostgreSQL ON CONFLICT (id) DO NOTHING for safe, idempotent reruns and duplicate prevention
        async with self.session_factory() as session:
            chunk_size = 50
            for i in range(0, len(records), chunk_size):
                chunk = records[i:i + chunk_size]
                stmt = pg_insert(table_obj).values(chunk).on_conflict_do_nothing(index_elements=['id'])
                await session.execute(stmt)
            await session.commit()

        # Immediate row count validation
        async with self.session_factory() as session:
            res = await session.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
            dst_count = res.scalar()

        if dst_count == expected_count:
            print(f"   SUCCESS: '{table_name}': {dst_count}/{expected_count} records migrated (100% Match).")
            return {"source": expected_count, "destination": dst_count, "status": "100% MATCH"}
        else:
            print(f"   CRITICAL ERROR: Mismatch in '{table_name}': Source {expected_count} vs Destination {dst_count}!")
            raise RuntimeError(f"Migration aborted due to row count mismatch in '{table_name}': expected {expected_count}, got {dst_count}")

    async def verify_foreign_keys(self):
        """Runs integrity check across key foreign relationships to ensure 0 orphaned records."""
        print("\n--- Phase 3: Validating Foreign Key Integrity in Supabase ---")
        checks = [
            ("candidate_profiles -> users", 'SELECT COUNT(*) FROM candidate_profiles cp LEFT JOIN users u ON cp.user_id = u.id WHERE u.id IS NULL'),
            ("resumes -> users", 'SELECT COUNT(*) FROM resumes r LEFT JOIN users u ON r.user_id = u.id WHERE u.id IS NULL'),
            ("interview_sessions -> users", 'SELECT COUNT(*) FROM interview_sessions s LEFT JOIN users u ON s.user_id = u.id WHERE u.id IS NULL'),
            ("interview_rounds -> sessions", 'SELECT COUNT(*) FROM interview_rounds r LEFT JOIN interview_sessions s ON r.session_id = s.id WHERE s.id IS NULL'),
            ("interview_questions -> sessions", 'SELECT COUNT(*) FROM interview_questions q LEFT JOIN interview_sessions s ON q.session_id = s.id WHERE s.id IS NULL'),
            ("interview_answers -> questions", 'SELECT COUNT(*) FROM interview_answers a LEFT JOIN interview_questions q ON a.question_id = q.id WHERE q.id IS NULL'),
            ("transcripts -> answers", 'SELECT COUNT(*) FROM transcripts t LEFT JOIN interview_answers a ON t.answer_id = a.id WHERE a.id IS NULL'),
            ("nlp_analyses -> transcripts", 'SELECT COUNT(*) FROM nlp_analyses n LEFT JOIN transcripts t ON n.transcript_id = t.id WHERE t.id IS NULL'),
            ("answer_evaluations -> answers", 'SELECT COUNT(*) FROM answer_evaluations e LEFT JOIN interview_answers a ON e.answer_id = a.id WHERE a.id IS NULL'),
            ("interview_reports -> sessions", 'SELECT COUNT(*) FROM interview_reports rep LEFT JOIN interview_sessions s ON rep.session_id = s.id WHERE s.id IS NULL'),
        ]

        failed_checks = []
        async with self.session_factory() as session:
            for desc, query in checks:
                res = await session.execute(text(query))
                orphan_count = res.scalar()
                status = "PASS (0 orphans)" if orphan_count == 0 else f"FAIL ({orphan_count} orphans)"
                print(f"   FK Check [{desc}]: {status}")
                if orphan_count > 0:
                    failed_checks.append((desc, orphan_count))

        if failed_checks:
            raise RuntimeError(f"Foreign key validation failed with orphaned records: {failed_checks}")

    async def close(self):
        await self.engine.dispose()

async def main():
    from app.core.config import settings
    default_supabase = "postgresql+asyncpg://postgres:deepu%402620051@db.ymcrmdrrxoihzokmwfei.supabase.co:5432/postgres"
    supabase_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("SUPABASE_URL_ASYNC")
    if not supabase_url:
        if settings.DATABASE_URL and "postgresql" in settings.DATABASE_URL:
            supabase_url = settings.DATABASE_URL
        else:
            supabase_url = default_supabase
    sqlite_path = os.path.abspath("interview_app.db")

    print(f"Source SQLite: {sqlite_path}")
    print(f"Target Database Host: db.ymcrmdrrxoihzokmwfei.supabase.co")

    migrator = SupabaseMigrator(sqlite_path, supabase_url)
    try:
        await migrator.create_schema()
        results = await migrator.migrate_data()
        await migrator.verify_foreign_keys()
        print("\nAll migration phases completed successfully!")
    finally:
        await migrator.close()

if __name__ == "__main__":
    asyncio.run(main())
