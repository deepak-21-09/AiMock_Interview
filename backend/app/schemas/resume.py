from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class ProjectSchema(BaseModel):
    name: str
    technologies: List[str] = []
    description: str

class ExperienceSchema(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None

class EducationSchema(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[str] = None

class JobMatchSchema(BaseModel):
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    match_percentage: float = 0.0

class ResumeUploadResponse(BaseModel):
    id: str
    file_name: str
    file_size_bytes: int
    confidence_score: float
    is_scanned: bool
    parsed_skills: List[str] = []
    parsed_projects: List[ProjectSchema] = []
    parsed_experience: List[ExperienceSchema] = []
    parsed_education: List[EducationSchema] = []
    job_match: JobMatchSchema
    created_at: datetime

    class Config:
        from_attributes = True

class ResumeUpdateSkillsRequest(BaseModel):
    skills: List[str]
