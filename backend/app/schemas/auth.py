from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    target_role: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    education: Optional[str] = None
    years_of_experience: Optional[float] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    bio: Optional[str] = None

class ProfileResponse(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str] = None
    education: Optional[str] = None
    years_of_experience: float
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    bio: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: str
    email: str
    is_active: bool
    created_at: datetime
    profile: Optional[ProfileResponse] = None

    class Config:
        from_attributes = True
