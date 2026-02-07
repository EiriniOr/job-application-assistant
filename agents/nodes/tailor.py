"""Tailor agent — generates cover letters and resume suggestions using LLM."""

import os
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from agents.state import AgentState
from mcp_server.tools.database import (
    get_application,
    get_or_create_default_user,
    get_primary_resume,
    save_document,
)

TAILOR_SYSTEM = """You are an expert career coach and professional writer.
Given a resume and a job description, generate:

1. A tailored cover letter (3 paragraphs, professional but authentic)
2. 3-5 specific suggestions for resume bullet improvements

Cover letter guidelines:
- Opening: Show genuine interest, mention specific company/role details
- Middle: Map 2-3 key experiences directly to job requirements
- Closing: Express enthusiasm, mention next steps
- Keep it under 400 words
- No generic filler

Resume suggestions guidelines:
- Reference specific bullets from the resume
- Show how to reword them to better match the job requirements
- Include relevant keywords from the job description
- Keep it truthful — never suggest adding skills the person doesn't have

Respond with the cover letter first, then a section "RESUME SUGGESTIONS:" with numbered suggestions."""


async def tailor_node(state: AgentState) -> dict:
    """Generate a tailored cover letter and resume suggestions."""
    params = state.get("params", {})
    application_id = params.get("application_id", "")

    if not application_id:
        return {"error": "application_id required", "cover_letter": "", "resume_suggestions": []}

    app = get_application(application_id)
    if not app:
        return {"error": "Application not found", "cover_letter": "", "resume_suggestions": []}

    # Get resume
    user = get_or_create_default_user()
    resume = get_primary_resume(user["id"])
    resume_text = resume.get("raw_text", "") if resume else state.get("resume_text", "")

    if not resume_text:
        return {"error": "No resume found", "cover_letter": "", "resume_suggestions": []}

    job_desc = app.get("job_description", "No description available")
    job_title = app.get("job_title", "Unknown")
    company = app.get("company", "Unknown")

    if not os.getenv("ANTHROPIC_API_KEY"):
        # Return a template if no API key
        cover_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {company}. [This is a template — set ANTHROPIC_API_KEY for AI-generated content.]

Based on my experience, I believe I would be an excellent fit for this role.

I look forward to discussing how my background aligns with your needs.

Best regards"""
        return {
            "cover_letter": cover_letter,
            "resume_suggestions": ["Set ANTHROPIC_API_KEY for personalized suggestions"],
            "error": "",
        }

    llm = ChatAnthropic(model="claude-sonnet-4-20250514", max_tokens=2000)
    messages = [
        SystemMessage(content=TAILOR_SYSTEM),
        HumanMessage(content=f"RESUME:\n{resume_text[:4000]}\n\nJOB: {job_title} at {company}\n\nJOB DESCRIPTION:\n{job_desc[:3000]}"),
    ]

    try:
        response = await llm.ainvoke(messages)
        text = response.content

        # Split cover letter and suggestions
        if "RESUME SUGGESTIONS:" in text:
            parts = text.split("RESUME SUGGESTIONS:")
            cover_letter = parts[0].strip()
            suggestions_text = parts[1].strip()
            suggestions = [s.strip() for s in suggestions_text.split("\n") if s.strip() and s.strip()[0].isdigit()]
        else:
            cover_letter = text.strip()
            suggestions = []

        # Save cover letter to DB
        save_document(application_id, "cover_letter", cover_letter)

        return {
            "cover_letter": cover_letter,
            "resume_suggestions": suggestions,
            "error": "",
        }
    except Exception as e:
        return {"error": f"LLM generation failed: {e}", "cover_letter": "", "resume_suggestions": []}
