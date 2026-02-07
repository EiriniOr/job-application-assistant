"""LangGraph orchestrator — connects supervisor + specialist agents."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from langgraph.graph import StateGraph, END

from agents.state import AgentState
from agents.nodes.supervisor import supervisor_node, route_to_agent
from agents.nodes.matcher import matcher_node
from agents.nodes.tailor import tailor_node
from agents.nodes.tracker import tracker_node
from mcp_server.tools.database import get_or_create_default_user, get_primary_resume


def build_graph() -> StateGraph:
    """Build the multi-agent LangGraph workflow."""
    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("matcher", matcher_node)
    graph.add_node("tailor", tailor_node)
    graph.add_node("tracker", tracker_node)

    # Entry: supervisor decides which agent to run
    graph.set_entry_point("supervisor")

    # Conditional routing from supervisor
    graph.add_conditional_edges(
        "supervisor",
        route_to_agent,
        {
            "matcher": "matcher",
            "tailor": "tailor",
            "tracker": "tracker",
            "end": END,
        },
    )

    # All specialist agents go to END after executing
    graph.add_edge("matcher", END)
    graph.add_edge("tailor", END)
    graph.add_edge("tracker", END)

    return graph


# Compile once
workflow = build_graph().compile()


async def run_workflow(action: str, params: dict) -> dict:
    """Execute a workflow and return results."""
    # Load user context
    user = get_or_create_default_user()
    resume = get_primary_resume(user["id"])

    initial_state: AgentState = {
        "messages": [],
        "action": action,
        "params": params,
        "next_agent": "end",
        "jobs_found": [],
        "match_scores": [],
        "cover_letter": "",
        "resume_suggestions": [],
        "application_update": {},
        "user_id": user["id"],
        "resume_text": resume.get("raw_text", "") if resume else "",
        "error": "",
    }

    result = await workflow.ainvoke(initial_state)

    return {
        "action": action,
        "jobs_found": result.get("jobs_found", []),
        "match_scores": result.get("match_scores", []),
        "cover_letter": result.get("cover_letter", ""),
        "resume_suggestions": result.get("resume_suggestions", []),
        "application_update": result.get("application_update", {}),
        "error": result.get("error", ""),
    }
