import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Resume
from app.agents.resume_analysis import resume_analyzer
from app.schemas.resume import (
    ResumeUploadResponse,
    ResumeUpdateSkillsRequest,
    JobMatchSchema
)
from app.core.config import settings

router = APIRouter()
UPLOAD_DIR = "./media/resumes"

@router.post("/upload", response_model=ResumeUploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validate extension
    filename = file.filename or "resume.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Only PDF and DOCX documents up to 5MB are accepted."
        )

    # Read and check size
    content = await file.read()
    if len(content) > settings.MAX_RESUME_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_RESUME_SIZE_MB}MB."
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    saved_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex[:12]}_{filename}")
    with open(saved_path, "wb") as f:
        f.write(content)

    # Run Resume Analysis Agent
    try:
        analysis = resume_analyzer.analyze_resume(saved_path, job_description or "")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse resume: {str(e)}")

    resume_record = Resume(
        user_id=current_user.id,
        file_name=filename,
        file_path=saved_path,
        file_size_bytes=len(content),
        raw_text=analysis["raw_text"],
        parsed_skills=analysis["skills"],
        parsed_projects=analysis["projects"],
        parsed_experience=analysis["experience"],
        parsed_education=analysis["education"],
        job_match=analysis["job_match"],
        confidence_score=analysis["confidence_score"],
        is_scanned=analysis["is_scanned"]
    )
    db.add(resume_record)
    await db.commit()
    await db.refresh(resume_record)

    return ResumeUploadResponse(
        id=resume_record.id,
        file_name=resume_record.file_name,
        file_size_bytes=resume_record.file_size_bytes,
        confidence_score=resume_record.confidence_score,
        is_scanned=resume_record.is_scanned,
        parsed_skills=resume_record.parsed_skills or [],
        parsed_projects=resume_record.parsed_projects or [],
        parsed_experience=resume_record.parsed_experience or [],
        parsed_education=resume_record.parsed_education or [],
        job_match=JobMatchSchema(**(resume_record.job_match or {})),
        created_at=resume_record.created_at
    )

@router.get("", response_model=List[ResumeUploadResponse])
async def list_resumes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
    res = await db.execute(stmt)
    resumes = res.scalars().all()
    out = []
    for r in resumes:
        out.append(ResumeUploadResponse(
            id=r.id,
            file_name=r.file_name,
            file_size_bytes=r.file_size_bytes,
            confidence_score=r.confidence_score,
            is_scanned=r.is_scanned,
            parsed_skills=r.parsed_skills or [],
            parsed_projects=r.parsed_projects or [],
            parsed_experience=r.parsed_experience or [],
            parsed_education=r.parsed_education or [],
            job_match=JobMatchSchema(**(r.job_match or {})),
            created_at=r.created_at
        ))
    return out

@router.get("/{resume_id}", response_model=ResumeUploadResponse)
async def get_resume(resume_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    res = await db.execute(stmt)
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return ResumeUploadResponse(
        id=r.id,
        file_name=r.file_name,
        file_size_bytes=r.file_size_bytes,
        confidence_score=r.confidence_score,
        is_scanned=r.is_scanned,
        parsed_skills=r.parsed_skills or [],
        parsed_projects=r.parsed_projects or [],
        parsed_experience=r.parsed_experience or [],
        parsed_education=r.parsed_education or [],
        job_match=JobMatchSchema(**(r.job_match or {})),
        created_at=r.created_at
    )

@router.put("/{resume_id}/skills", response_model=ResumeUploadResponse)
async def update_resume_skills(
    resume_id: str,
    payload: ResumeUpdateSkillsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    res = await db.execute(stmt)
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found.")
    r.parsed_skills = payload.skills
    await db.commit()
    await db.refresh(r)
    return ResumeUploadResponse(
        id=r.id,
        file_name=r.file_name,
        file_size_bytes=r.file_size_bytes,
        confidence_score=r.confidence_score,
        is_scanned=r.is_scanned,
        parsed_skills=r.parsed_skills or [],
        parsed_projects=r.parsed_projects or [],
        parsed_experience=r.parsed_experience or [],
        parsed_education=r.parsed_education or [],
        job_match=JobMatchSchema(**(r.job_match or {})),
        created_at=r.created_at
    )

@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    res = await db.execute(stmt)
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if os.path.exists(r.file_path):
        try:
            os.remove(r.file_path)
        except Exception:
            pass
    await db.delete(r)
    await db.commit()
    return {"message": "Resume deleted successfully."}
