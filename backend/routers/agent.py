"""Agent execution routes — triggers LangGraph workflows from the API."""

from fastapi import APIRouter
from backend.schemas import AgentRunRequest, AgentRunResponse

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(body: AgentRunRequest):
    """Trigger an agent workflow.

    Actions:
    - search_jobs: Find and score matching jobs
    - tailor_application: Generate cover letter + resume suggestions
    - update_status: Track application status changes
    """
    # Import here to avoid circular imports
    from agents.orchestrator import run_workflow

    result = await run_workflow(body.action, body.params)
    return AgentRunResponse(status="completed", result=result)
