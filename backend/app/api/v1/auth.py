from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.entities import User, CandidateProfile
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    ProfileUpdateRequest,
    ProfileResponse
)
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password)
    )
    db.add(user)
    await db.flush()

    profile = CandidateProfile(
        user_id=user.id,
        full_name=payload.full_name or payload.email.split("@")[0].title(),
        target_role=payload.target_role or "Software Engineer"
    )
    db.add(profile)
    await db.commit()

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email
    )

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()

    prof_resp = ProfileResponse.from_orm(profile) if profile else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        profile=prof_resp
    )

@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id, full_name=current_user.email.split("@")[0])
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile

@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(CandidateProfile).where(CandidateProfile.user_id == current_user.id)
    res = await db.execute(stmt)
    profile = res.scalar_one_or_none()
    if not profile:
        profile = CandidateProfile(user_id=current_user.id)
        db.add(profile)

    if payload.full_name is not None:
        profile.full_name = payload.full_name
    if payload.education is not None:
        profile.education = payload.education
    if payload.years_of_experience is not None:
        profile.years_of_experience = payload.years_of_experience
    if payload.current_role is not None:
        profile.current_role = payload.current_role
    if payload.target_role is not None:
        profile.target_role = payload.target_role
    if payload.bio is not None:
        profile.bio = payload.bio

    await db.commit()
    await db.refresh(profile)
    return profile
