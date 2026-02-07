"""Resume upload and management routes."""

import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File

from mcp_server.tools.database import (
    get_or_create_default_user,
    save_resume,
    get_resumes,
    get_primary_resume,
)
from mcp_server.tools.resume_parser import parse_resume

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

UPLOAD_DIR = Path("data/uploads")


@router.get("")
async def list_resumes():
    user = get_or_create_default_user()
    resumes = get_resumes(user["id"])
    return {"count": len(resumes), "resumes": resumes}


@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / file.filename
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    parsed = parse_resume(str(file_path))
    user = get_or_create_default_user()
    saved = save_resume(
        user_id=user["id"],
        filename=file.filename,
        parsed_data=parsed["sections"],
        raw_text=parsed["raw_text"],
    )
    return {"resume_id": saved["id"], "filename": file.filename, "sections": list(parsed["sections"].keys())}


@router.get("/primary")
async def get_primary():
    user = get_or_create_default_user()
    resume = get_primary_resume(user["id"])
    if not resume:
        return {"error": "No resume uploaded yet"}
    return resume
