"""MCP Server for Job Application Assistant.

Exposes tools for job search, resume parsing, cover letter generation,
and application tracking via the Model Context Protocol.
"""

import json
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP

from tools.job_boards import search_adzuna, search_remoteok
from tools.resume_parser import parse_resume as _parse_resume
from tools.database import (
    init_db_sync,
    get_or_create_default_user,
    save_job,
    get_jobs,
    get_job,
    create_application,
    update_application_status,
    get_applications,
    get_application,
    get_application_events,
    save_document,
    save_resume,
    get_primary_resume,
    get_resumes,
    save_match,
)

mcp = FastMCP("job-assistant", instructions="Job application assistant MCP server")

# Init DB on startup
init_db_sync()


# ════════════════════════════════════════
# Job Search Tools
# ════════════════════════════════════════

@mcp.tool()
async def search_jobs(
    keywords: str,
    location: str = "",
    remote_only: bool = False,
    source: str = "all",
    limit: int = 10,
) -> str:
    """Search for jobs across Adzuna and RemoteOK.

    Args:
        keywords: Search terms (e.g. "python developer", "data scientist")
        location: City or region (used for Adzuna)
        remote_only: If true, only search RemoteOK
        source: "adzuna", "remoteok", or "all"
        limit: Max results per source
    """
    results = []

    if source in ("all", "remoteok") or remote_only:
        tag = keywords.split()[0].lower() if keywords else "python"
        remoteok_jobs = await search_remoteok(tags=tag, limit=limit)
        results.extend(remoteok_jobs)

    if not remote_only and source in ("all", "adzuna"):
        adzuna_jobs = await search_adzuna(keywords=keywords, location=location, results_per_page=limit)
        results.extend(adzuna_jobs)

    # Save to database
    saved = []
    for job in results:
        saved_job = save_job(job)
        saved.append(saved_job)

    return json.dumps({
        "count": len(saved),
        "jobs": saved[:limit * 2],
    }, default=str)


@mcp.tool()
async def get_job_details(job_id: str) -> str:
    """Get full details for a specific job.

    Args:
        job_id: The database ID of the job
    """
    job = get_job(job_id)
    if not job:
        return json.dumps({"error": "Job not found"})
    return json.dumps(job, default=str)


@mcp.tool()
async def list_saved_jobs(limit: int = 50) -> str:
    """List all saved jobs.

    Args:
        limit: Max number of jobs to return
    """
    jobs = get_jobs(limit=limit)
    return json.dumps({"count": len(jobs), "jobs": jobs}, default=str)


# ════════════════════════════════════════
# Resume Tools
# ════════════════════════════════════════

@mcp.tool()
async def parse_and_save_resume(file_path: str) -> str:
    """Parse a resume file (PDF/DOCX) and save to database.

    Args:
        file_path: Path to the resume file
    """
    parsed = _parse_resume(file_path)
    user = get_or_create_default_user()
    saved = save_resume(
        user_id=user["id"],
        filename=parsed["filename"],
        parsed_data=parsed["sections"],
        raw_text=parsed["raw_text"],
    )
    return json.dumps({"resume_id": saved["id"], "sections": list(parsed["sections"].keys())}, default=str)


@mcp.tool()
async def get_user_resume() -> str:
    """Get the current user's primary resume."""
    user = get_or_create_default_user()
    resume = get_primary_resume(user["id"])
    if not resume:
        return json.dumps({"error": "No resume found. Upload one first."})
    return json.dumps(resume, default=str)


# ════════════════════════════════════════
# Application Management Tools
# ════════════════════════════════════════

@mcp.tool()
async def create_job_application(job_id: str) -> str:
    """Create a new job application (status: saved).

    Args:
        job_id: ID of the job to apply to
    """
    user = get_or_create_default_user()
    resume = get_primary_resume(user["id"])
    app = create_application(
        user_id=user["id"],
        job_id=job_id,
        resume_id=resume["id"] if resume else None,
    )
    return json.dumps(app, default=str)


@mcp.tool()
async def update_application(application_id: str, status: str, notes: str = "") -> str:
    """Update a job application's status.

    Args:
        application_id: The application ID
        status: New status (saved, applied, phone_screen, interview, offer, rejected, withdrawn)
        notes: Optional notes about the update
    """
    app = update_application_status(application_id, status, notes or None)
    return json.dumps(app, default=str)


@mcp.tool()
async def list_applications(status: str = "") -> str:
    """List all job applications, optionally filtered by status.

    Args:
        status: Filter by status (empty for all)
    """
    user = get_or_create_default_user()
    apps = get_applications(user["id"], status=status or None)
    return json.dumps({"count": len(apps), "applications": apps}, default=str)


@mcp.tool()
async def get_application_detail(application_id: str) -> str:
    """Get full details for an application including timeline.

    Args:
        application_id: The application ID
    """
    app = get_application(application_id)
    if not app:
        return json.dumps({"error": "Application not found"})
    events = get_application_events(application_id)
    app["events"] = events
    return json.dumps(app, default=str)


# ════════════════════════════════════════
# Document Generation Tools
# ════════════════════════════════════════

@mcp.tool()
async def save_cover_letter(application_id: str, content: str) -> str:
    """Save a generated cover letter for an application.

    Args:
        application_id: The application ID
        content: The cover letter text
    """
    doc = save_document(application_id, "cover_letter", content)
    return json.dumps(doc, default=str)


@mcp.tool()
async def save_match_score(
    job_id: str,
    score: float,
    reasons: list[str],
    skills_matched: list[str],
    skills_missing: list[str],
) -> str:
    """Save a job match score for the current user.

    Args:
        job_id: The job ID
        score: Match score 0.0 to 1.0
        reasons: List of reasons for the score
        skills_matched: Skills that match
        skills_missing: Skills that are missing
    """
    user = get_or_create_default_user()
    result = save_match(user["id"], job_id, score, reasons, skills_matched, skills_missing)
    return json.dumps(result, default=str)


# ════════════════════════════════════════
# Resources
# ════════════════════════════════════════

@mcp.resource("user://profile")
async def get_user_profile() -> str:
    """Current user's profile info."""
    user = get_or_create_default_user()
    resume = get_primary_resume(user["id"])
    return json.dumps({
        "user": user,
        "has_resume": resume is not None,
        "resume_text": resume.get("raw_text", "")[:2000] if resume else None,
    }, default=str)


if __name__ == "__main__":
    mcp.run()
