"""Database CRUD operations as MCP tool helpers."""

import uuid
import sqlite3
import json
import os
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = os.getenv("DB_FILE_PATH", "data/jobs.db")


def _get_conn() -> sqlite3.Connection:
    Path(DB_PATH).parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db_sync():
    """Initialize database from schema file."""
    schema_path = Path(__file__).parent.parent.parent / "db" / "schema.sql"
    conn = _get_conn()
    conn.executescript(schema_path.read_text())
    conn.commit()
    conn.close()


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Users ──

def get_or_create_default_user() -> dict:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM users LIMIT 1").fetchone()
    if row:
        result = dict(row)
        conn.close()
        return result

    uid = _uid()
    conn.execute(
        "INSERT INTO users (id, email, name) VALUES (?, ?, ?)",
        (uid, "default@example.com", "Default User"),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (uid,)).fetchone()
    result = dict(row)
    conn.close()
    return result


# ── Jobs ──

def save_job(job: dict) -> dict:
    conn = _get_conn()
    existing = conn.execute(
        "SELECT * FROM jobs WHERE source = ? AND source_id = ?",
        (job["source"], job.get("source_id", "")),
    ).fetchone()
    if existing:
        result = dict(existing)
        conn.close()
        return result

    jid = _uid()
    conn.execute(
        """INSERT INTO jobs (id, source, source_id, title, company, company_url,
           location, is_remote, salary_min, salary_max, description, requirements,
           posted_at, raw_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            jid, job["source"], job.get("source_id", ""),
            job["title"], job["company"], job.get("company_url"),
            job.get("location"), job.get("is_remote"),
            job.get("salary_min"), job.get("salary_max"),
            job.get("description"), json.dumps(job.get("requirements")),
            job.get("posted_at"), json.dumps(job),
            _now(),
        ),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (jid,)).fetchone()
    result = dict(row)
    conn.close()
    return result


def get_jobs(limit: int = 50) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_job(job_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Applications ──

def create_application(user_id: str, job_id: str, resume_id: str | None = None) -> dict:
    conn = _get_conn()
    aid = _uid()
    now = _now()
    conn.execute(
        """INSERT INTO applications (id, user_id, job_id, resume_id, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'saved', ?, ?)""",
        (aid, user_id, job_id, resume_id, now, now),
    )
    # Log event
    conn.execute(
        "INSERT INTO application_events (id, application_id, event_type, new_value, created_at) VALUES (?, ?, ?, ?, ?)",
        (_uid(), aid, "status_change", "saved", now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM applications WHERE id = ?", (aid,)).fetchone()
    result = dict(row)
    conn.close()
    return result


def update_application_status(application_id: str, status: str, notes: str | None = None) -> dict:
    conn = _get_conn()
    old = conn.execute("SELECT status FROM applications WHERE id = ?", (application_id,)).fetchone()
    old_status = dict(old)["status"] if old else None
    now = _now()

    conn.execute(
        "UPDATE applications SET status = ?, notes = COALESCE(?, notes), updated_at = ? WHERE id = ?",
        (status, notes, now, application_id),
    )
    if status == "applied":
        conn.execute(
            "UPDATE applications SET applied_at = ? WHERE id = ?",
            (now, application_id),
        )

    conn.execute(
        "INSERT INTO application_events (id, application_id, event_type, old_value, new_value, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (_uid(), application_id, "status_change", old_status, status, notes, now),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM applications WHERE id = ?", (application_id,)).fetchone()
    result = dict(row)
    conn.close()
    return result


def get_applications(user_id: str, status: str | None = None, limit: int = 50) -> list[dict]:
    conn = _get_conn()
    if status:
        rows = conn.execute(
            "SELECT a.*, j.title as job_title, j.company FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.user_id = ? AND a.status = ? ORDER BY a.updated_at DESC LIMIT ?",
            (user_id, status, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT a.*, j.title as job_title, j.company FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.user_id = ? ORDER BY a.updated_at DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_application(application_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT a.*, j.title as job_title, j.company, j.description as job_description FROM applications a JOIN jobs j ON a.job_id = j.id WHERE a.id = ?",
        (application_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_application_events(application_id: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM application_events WHERE application_id = ? ORDER BY created_at DESC",
        (application_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Documents ──

def save_document(application_id: str, doc_type: str, content: str) -> dict:
    conn = _get_conn()
    did = _uid()
    # Get current max version
    row = conn.execute(
        "SELECT MAX(version) as v FROM documents WHERE application_id = ? AND doc_type = ?",
        (application_id, doc_type),
    ).fetchone()
    version = (dict(row)["v"] or 0) + 1

    conn.execute(
        "INSERT INTO documents (id, application_id, doc_type, content, version, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (did, application_id, doc_type, content, version, _now()),
    )
    conn.commit()

    # Also store on application if cover letter
    if doc_type == "cover_letter":
        conn.execute(
            "UPDATE applications SET cover_letter = ?, updated_at = ? WHERE id = ?",
            (content, _now(), application_id),
        )
        conn.commit()

    result = {"id": did, "doc_type": doc_type, "version": version, "content": content}
    conn.close()
    return result


# ── Resumes ──

def save_resume(user_id: str, filename: str, parsed_data: dict, raw_text: str) -> dict:
    conn = _get_conn()
    rid = _uid()
    conn.execute(
        "INSERT INTO resumes (id, user_id, filename, parsed_data, raw_text, is_primary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (rid, user_id, filename, json.dumps(parsed_data), raw_text, True, _now()),
    )
    # Set all others to non-primary
    conn.execute("UPDATE resumes SET is_primary = FALSE WHERE user_id = ? AND id != ?", (user_id, rid))
    conn.commit()
    row = conn.execute("SELECT * FROM resumes WHERE id = ?", (rid,)).fetchone()
    result = dict(row)
    conn.close()
    return result


def get_primary_resume(user_id: str) -> dict | None:
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM resumes WHERE user_id = ? AND is_primary = TRUE ORDER BY created_at DESC LIMIT 1",
        (user_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_resumes(user_id: str) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM resumes WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Match Scores ──

def save_match(user_id: str, job_id: str, score: float, reasons: list[str],
               matched: list[str], missing: list[str]) -> dict:
    conn = _get_conn()
    mid = _uid()
    conn.execute(
        """INSERT OR REPLACE INTO job_matches (id, user_id, job_id, match_score,
           match_reasons, skills_matched, skills_missing, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (mid, user_id, job_id, score, json.dumps(reasons),
         json.dumps(matched), json.dumps(missing), _now()),
    )
    conn.commit()
    conn.close()
    return {"id": mid, "match_score": score, "match_reasons": reasons}
