"""Job board API integrations: Adzuna (free tier) + RemoteOK (free)."""

import os
import httpx

ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "")
ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs"


async def search_adzuna(
    keywords: str,
    location: str = "",
    country: str = "us",
    results_per_page: int = 10,
) -> list[dict]:
    """Search Adzuna job board. Free tier: 250 calls/month."""
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "results_per_page": results_per_page,
        "what": keywords,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location

    url = f"{ADZUNA_BASE}/{country}/search/1"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params)
        if resp.status_code != 200:
            return []
        data = resp.json()

    jobs = []
    for r in data.get("results", []):
        jobs.append({
            "source": "adzuna",
            "source_id": str(r.get("id", "")),
            "title": r.get("title", ""),
            "company": r.get("company", {}).get("display_name", "Unknown"),
            "location": r.get("location", {}).get("display_name", ""),
            "description": r.get("description", ""),
            "salary_min": int(r["salary_min"]) if r.get("salary_min") else None,
            "salary_max": int(r["salary_max"]) if r.get("salary_max") else None,
            "url": r.get("redirect_url", ""),
            "posted_at": r.get("created", ""),
        })
    return jobs


async def search_remoteok(tags: str = "python", limit: int = 10) -> list[dict]:
    """Search RemoteOK API. Completely free, no auth needed."""
    url = f"https://remoteok.com/api?tag={tags}&limit={limit}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, headers={"User-Agent": "job-assistant/1.0"})
        if resp.status_code != 200:
            return []
        data = resp.json()

    # First element is metadata, skip it
    jobs = []
    for r in data[1:]:
        salary_min = None
        salary_max = None
        if r.get("salary_min"):
            salary_min = int(r["salary_min"])
        if r.get("salary_max"):
            salary_max = int(r["salary_max"])

        jobs.append({
            "source": "remoteok",
            "source_id": str(r.get("id", "")),
            "title": r.get("position", ""),
            "company": r.get("company", "Unknown"),
            "location": "Remote",
            "is_remote": True,
            "description": r.get("description", ""),
            "salary_min": salary_min,
            "salary_max": salary_max,
            "url": r.get("url", ""),
            "posted_at": r.get("date", ""),
            "tags": r.get("tags", []),
        })
    return jobs[:limit]
