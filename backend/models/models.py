"""SQLAlchemy ORM models."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    resumes: Mapped[list["Resume"]] = relationship(back_populates="user")
    preferences: Mapped[list["Preference"]] = relationship(back_populates="user")
    applications: Mapped[list["Application"]] = relationship(back_populates="user")


class Resume(Base):
    __tablename__ = "resumes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String, nullable=False)
    parsed_data: Mapped[dict | None] = mapped_column(JSON)
    raw_text: Mapped[str | None] = mapped_column(Text)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    user: Mapped["User"] = relationship(back_populates="resumes")


class Preference(Base):
    __tablename__ = "preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    target_roles: Mapped[list | None] = mapped_column(JSON)
    target_locations: Mapped[list | None] = mapped_column(JSON)
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    remote_preference: Mapped[str] = mapped_column(String, default="any")
    industries: Mapped[list | None] = mapped_column(JSON)
    excluded_companies: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    user: Mapped["User"] = relationship(back_populates="preferences")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String, nullable=False)
    source_id: Mapped[str | None] = mapped_column(String)
    title: Mapped[str] = mapped_column(String, nullable=False)
    company: Mapped[str] = mapped_column(String, nullable=False)
    company_url: Mapped[str | None] = mapped_column(String)
    location: Mapped[str | None] = mapped_column(String)
    is_remote: Mapped[bool | None] = mapped_column(Boolean)
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    requirements: Mapped[list | None] = mapped_column(JSON)
    posted_at: Mapped[datetime | None] = mapped_column()
    raw_data: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=_now)


class JobMatch(Base):
    __tablename__ = "job_matches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"))
    match_score: Mapped[float | None] = mapped_column(Float)
    match_reasons: Mapped[list | None] = mapped_column(JSON)
    skills_matched: Mapped[list | None] = mapped_column(JSON)
    skills_missing: Mapped[list | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    job: Mapped["Job"] = relationship()


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"))
    resume_id: Mapped[str | None] = mapped_column(ForeignKey("resumes.id"))
    status: Mapped[str] = mapped_column(String, default="saved")
    cover_letter: Mapped[str | None] = mapped_column(Text)
    tailored_resume: Mapped[dict | None] = mapped_column(JSON)
    applied_at: Mapped[datetime | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=_now)
    updated_at: Mapped[datetime] = mapped_column(default=_now, onupdate=_now)

    job: Mapped["Job"] = relationship()
    user: Mapped["User"] = relationship(back_populates="applications")
    events: Mapped[list["ApplicationEvent"]] = relationship(back_populates="application")
    documents: Mapped[list["Document"]] = relationship(back_populates="application")


class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"))
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    old_value: Mapped[str | None] = mapped_column(String)
    new_value: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    application: Mapped["Application"] = relationship(back_populates="events")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"))
    reminder_date: Mapped[datetime] = mapped_column(nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=_now)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"))
    doc_type: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(default=_now)

    application: Mapped["Application"] = relationship(back_populates="documents")
