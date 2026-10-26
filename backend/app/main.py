import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.session import engine, Base
import app.models  # Ensure all models are registered on metadata
from app.api.v1.auth import router as auth_router
from app.api.v1.resumes import router as resumes_router
from app.api.v1.interviews import router as interviews_router
from app.api.v1.reports import router as reports_router
from app.api.v1.proctoring import router as proctoring_router
from app.api.v1.practice import router as practice_router
from app.api.v1.history import router as history_router
from app.api.v1.internal_nlp import router as internal_nlp_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup (works with both SQLite and Postgres)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs(settings.MEDIA_DIR, exist_ok=True)

    os.makedirs(os.path.join(settings.MEDIA_DIR, "resumes"), exist_ok=True)

    os.makedirs(os.path.join(settings.MEDIA_DIR, "reports"), exist_ok=True)

    os.makedirs(os.path.join(settings.MEDIA_DIR, "answers"), exist_ok=True)
    yield
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Adaptive AI Mock Interview System - Backend API",
    lifespan=lifespan
)

# CORS setup

origins = settings.CORS_ORIGINS

if isinstance(origins, str):

    origins = [o.strip() for o in origins.split(",") if o.strip()]



app.add_middleware(

    CORSMiddleware,

    allow_origins=origins if origins else ["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)

# Mount Routers
app.include_router(auth_router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication & Profile"])
app.include_router(resumes_router, prefix=f"{settings.API_V1_PREFIX}/resumes", tags=["Resumes"])
app.include_router(interviews_router, prefix=f"{settings.API_V1_PREFIX}/interviews", tags=["Interviews"])
app.include_router(reports_router, prefix=f"{settings.API_V1_PREFIX}/interviews", tags=["Reports"])
app.include_router(proctoring_router, prefix=f"{settings.API_V1_PREFIX}/interviews", tags=["Proctoring & Anti-Cheating"])
app.include_router(practice_router, prefix=f"{settings.API_V1_PREFIX}/practice", tags=["Practice"])
app.include_router(history_router, prefix=f"{settings.API_V1_PREFIX}/history", tags=["History & Privacy"])
app.include_router(internal_nlp_router, prefix="/internal", tags=["Internal NLP"])

@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected"
    }
