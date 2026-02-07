"""Application management routes."""

from fastapi import APIRouter
from backend.schemas import ApplicationCreate, ApplicationUpdate
from mcp_server.tools.database import (
    get_or_create_default_user,
    create_application,
    update_application_status,
    get_applications,
    get_application,
    get_application_events,
    get_primary_resume,
)

router = APIRouter(prefix="/api/applications", tags=["applications"])


@router.get("")
async def list_applications(status: str | None = None):
    user = get_or_create_default_user()
    apps = get_applications(user["id"], status=status)
    return {"count": len(apps), "applications": apps}


@router.post("")
async def create(body: ApplicationCreate):
    user = get_or_create_default_user()
    resume = get_primary_resume(user["id"])
    app = create_application(
        user_id=user["id"],
        job_id=body.job_id,
        resume_id=body.resume_id or (resume["id"] if resume else None),
    )
    return app


@router.get("/{application_id}")
async def get_detail(application_id: str):
    app = get_application(application_id)
    if not app:
        return {"error": "Not found"}, 404
    events = get_application_events(application_id)
    app["events"] = events
    return app


@router.patch("/{application_id}")
async def update(application_id: str, body: ApplicationUpdate):
    if body.status:
        app = update_application_status(application_id, body.status, body.notes)
        return app
    return {"error": "Nothing to update"}
