from pydantic import BaseModel, Field
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

# ATS Checker Schemas
class ATSCheckRequest(BaseModel):
    resume_id: Optional[str] = None
    job_description: str = Field(..., min_length=20, max_length=15000)

class MatchingSkillDetail(BaseModel):
    skill: str
    identified_in_resume: bool = True
    evidence_snippet: Optional[str] = None

class MissingSkillDetail(BaseModel):
    skill: str
    why_it_matters: str
    requirement_type: str = "Required"  # "Required" or "Preferred"
    suggested_steps: str

class CategoryComparison(BaseModel):
    category: str
    required_items: List[str] = []
    demonstrated_items: List[str] = []
    missing_items: List[str] = []
    status: str = "Partially Met"  # "Fully Met", "Partially Met", "Needs Attention"

class ImprovementSuggestion(BaseModel):
    category: str  # e.g. "Projects & Experience", "Keywords & Terminology", "Measurable Impact", "Bullet Points"
    suggestion: str
    impact: str = "High"  # "High", "Medium", "Recommended"

class ATSAnalysisResponse(BaseModel):
    resume_id: str
    resume_file_name: str
    match_score: int  # 0 to 100
    score_explanation: str
    disclaimer: str
    matching_skills: List[MatchingSkillDetail] = []
    missing_skills: List[MissingSkillDetail] = []
    requirement_breakdown: List[CategoryComparison] = []
    improvement_suggestions: List[ImprovementSuggestion] = []
    analyzed_at: datetime
