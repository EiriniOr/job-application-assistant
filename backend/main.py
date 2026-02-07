"""FastAPI application entry point."""

import sys
import os
from contextlib import asynccontextmanager
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mcp_server.tools.database import init_db_sync
from backend.routers import jobs, applications, resumes, agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db_sync()
    yield


app = FastAPI(
    title="Job Application Assistant",
    description="Multi-agent job application assistant API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(resumes.router)
app.include_router(agent.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
