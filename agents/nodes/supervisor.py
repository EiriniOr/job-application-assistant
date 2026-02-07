"""Supervisor agent — routes tasks to the right specialist agent."""

from agents.state import AgentState


def supervisor_node(state: AgentState) -> dict:
    """Decide which agent handles the current action."""
    action = state.get("action", "")

    routing = {
        "search_jobs": "matcher",
        "tailor_application": "tailor",
        "update_status": "tracker",
    }

    next_agent = routing.get(action, "end")
    return {"next_agent": next_agent}


def route_to_agent(state: AgentState) -> str:
    """Conditional edge function for LangGraph."""
    return state.get("next_agent", "end")
