"""Matcher agent — finds jobs and calculates match scores using LLM."""

import json
import os
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from agents.state import AgentState
from mcp_server.tools.job_boards import search_arbetsformedlingen, search_adzuna, search_remoteok
from mcp_server.tools.database import save_job, save_match, get_or_create_default_user

MATCHER_SYSTEM = """You are a job matching specialist. Given a user's resume/skills and a list of job postings,
score each job from 0.0 to 1.0 based on:
1. Skill overlap (weight: 40%)
2. Experience level fit (weight: 25%)
3. Location/remote compatibility (weight: 20%)
4. Role title relevance (weight: 15%)

For each job, respond with JSON:
{
  "matches": [
    {
      "job_index": 0,
      "score": 0.85,
      "reasons": ["Strong Python match", "Remote compatible"],
      "skills_matched": ["Python", "FastAPI"],
      "skills_missing": ["Kubernetes"]
    }
  ]
}

Be strict: only score >0.7 if genuine strong match. Be honest about gaps."""


async def matcher_node(state: AgentState) -> dict:
    """Search for jobs and score them against user's resume."""
    params = state.get("params", {})
    keywords = params.get("keywords", "python developer")
    location = params.get("location", "")
    remote_only = params.get("remote_only", False)

    # Fetch jobs from APIs
    all_jobs = []
    try:
        # Arbetsförmedlingen (Swedish jobs) - FREE, primary source
        if not remote_only:
            af_jobs = await search_arbetsformedlingen(keywords=keywords)
            all_jobs.extend(af_jobs)
        # RemoteOK (remote/tech jobs)
        remoteok_jobs = await search_remoteok(tags=keywords.split()[0].lower())
        all_jobs.extend(remoteok_jobs)
    except Exception as e:
        return {"error": f"Job search failed: {e}", "jobs_found": [], "match_scores": []}

    if not all_jobs:
        return {"jobs_found": [], "match_scores": [], "error": "No jobs found"}

    # Save jobs to DB
    saved_jobs = []
    for job in all_jobs[:20]:
        saved = save_job(job)
        saved_jobs.append(saved)

    # Score with LLM if resume available
    resume_text = state.get("resume_text", "")
    match_scores = []

    if resume_text and os.getenv("ANTHROPIC_API_KEY"):
        llm = ChatAnthropic(model="claude-sonnet-4-20250514", max_tokens=2000)

        jobs_summary = "\n".join([
            f"[{i}] {j['title']} at {j['company']} — {j.get('location', 'Unknown')} — {j.get('description', '')[:200]}"
            for i, j in enumerate(saved_jobs[:10])
        ])

        messages = [
            SystemMessage(content=MATCHER_SYSTEM),
            HumanMessage(content=f"Resume:\n{resume_text[:3000]}\n\nJobs:\n{jobs_summary}"),
        ]

        try:
            response = await llm.ainvoke(messages)
            text = response.content
            # Extract JSON from response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(text[start:end])
                user = get_or_create_default_user()
                for m in data.get("matches", []):
                    idx = m.get("job_index", 0)
                    if idx < len(saved_jobs):
                        save_match(
                            user_id=user["id"],
                            job_id=saved_jobs[idx]["id"],
                            score=m["score"],
                            reasons=m.get("reasons", []),
                            matched=m.get("skills_matched", []),
                            missing=m.get("skills_missing", []),
                        )
                        match_scores.append({
                            "job_id": saved_jobs[idx]["id"],
                            "job_title": saved_jobs[idx]["title"],
                            "company": saved_jobs[idx]["company"],
                            **m,
                        })
        except Exception:
            # LLM scoring failed, return jobs without scores
            pass

    return {
        "jobs_found": saved_jobs,
        "match_scores": match_scores,
        "error": "",
    }
