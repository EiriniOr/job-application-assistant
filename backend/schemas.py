"""Pydantic schemas for API request/response."""

from datetime import datetime
from pydantic import BaseModel


# ── Jobs ──

class JobOut(BaseModel):
    id: str
    source: str
    source_id: str | None = None
    title: str
    company: str
    company_url: str | None = None
    location: str | None = None
    is_remote: bool | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    description: str | None = None
    requirements: list[str] | None = None
    posted_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JobMatchOut(BaseModel):
    id: str
    job: JobOut
    match_score: float | None = None
    match_reasons: list[str] | None = None
    skills_matched: list[str] | None = None
    skills_missing: list[str] | None = None

    model_config = {"from_attributes": True}


# ── Applications ──

class ApplicationCreate(BaseModel):
    job_id: str
    resume_id: str | None = None
    status: str = "saved"


class ApplicationUpdate(BaseModel):
    status: str | None = None
    notes: str | None = None
    cover_letter: str | None = None


class ApplicationEventOut(BaseModel):
    id: str
    event_type: str
    old_value: str | None = None
    new_value: str | None = None
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApplicationOut(BaseModel):
    id: str
    job: JobOut
    status: str
    cover_letter: str | None = None
    tailored_resume: dict | None = None
    applied_at: datetime | None = None
    notes: str | None = None
    events: list[ApplicationEventOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Resumes ──

class ResumeOut(BaseModel):
    id: str
    filename: str
    parsed_data: dict | None = None
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Preferences ──

class PreferencesUpdate(BaseModel):
    target_roles: list[str] | None = None
    target_locations: list[str] | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    remote_preference: str = "any"


class PreferencesOut(BaseModel):
    id: str
    target_roles: list[str] | None = None
    target_locations: list[str] | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    remote_preference: str

    model_config = {"from_attributes": True}


# ── Agent ──

class AgentRunRequest(BaseModel):
    action: str  # "search_jobs", "tailor_application", "update_status"
    params: dict = {}


class AgentRunResponse(BaseModel):
    status: str
    result: dict
