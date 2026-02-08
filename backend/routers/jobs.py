"""Job listing routes."""

from fastapi import APIRouter
from mcp_server.tools.job_boards import search_arbetsformedlingen, search_adzuna, search_remoteok
from mcp_server.tools.database import save_job, get_jobs, get_job

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("")
async def list_jobs(limit: int = 50):
    jobs = get_jobs(limit=limit)
    return {"count": len(jobs), "jobs": jobs}


@router.get("/search")
async def search(
    keywords: str = "python",
    location: str = "",
    remote_only: bool = False,
    limit: int = 10,
):
    results = []

    # Arbetsförmedlingen (Swedish jobs) - FREE, primary source
    if not remote_only:
        af_jobs = await search_arbetsformedlingen(keywords=keywords, limit=limit)
        results.extend(af_jobs)

    # RemoteOK (remote/tech jobs)
    tag = keywords.split()[0].lower() if keywords else "python"
    remoteok = await search_remoteok(tags=tag, limit=limit)
    results.extend(remoteok)

    saved = [save_job(j) for j in results]
    return {"count": len(saved), "jobs": saved}


@router.get("/{job_id}")
async def get_job_detail(job_id: str):
    job = get_job(job_id)
    if not job:
        return {"error": "Not found"}, 404
    return job
