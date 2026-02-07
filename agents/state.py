"""Shared state schema for the LangGraph agent workflow."""

from typing import Literal, TypedDict
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """State passed between all agents in the graph."""
    messages: list[BaseMessage]
    action: str  # "search_jobs", "tailor_application", "update_status"
    params: dict
    # Set by supervisor
    next_agent: Literal["matcher", "tailor", "tracker", "end"]
    # Accumulated results
    jobs_found: list[dict]
    match_scores: list[dict]
    cover_letter: str
    resume_suggestions: list[str]
    application_update: dict
    # User context
    user_id: str
    resume_text: str
    error: str
