"""Tracker agent — manages application status and generates summaries."""

from agents.state import AgentState
from mcp_server.tools.database import (
    get_or_create_default_user,
    update_application_status,
    get_applications,
    get_application,
    get_application_events,
)


async def tracker_node(state: AgentState) -> dict:
    """Update application status or generate pipeline summary."""
    params = state.get("params", {})
    sub_action = params.get("sub_action", "update")

    if sub_action == "update":
        application_id = params.get("application_id", "")
        new_status = params.get("status", "")
        notes = params.get("notes", "")

        if not application_id or not new_status:
            return {"error": "application_id and status required", "application_update": {}}

        app = update_application_status(application_id, new_status, notes or None)
        return {"application_update": app, "error": ""}

    elif sub_action == "summary":
        user = get_or_create_default_user()
        all_apps = get_applications(user["id"])

        summary = {
            "total": len(all_apps),
            "by_status": {},
            "applications": all_apps,
        }
        for app in all_apps:
            status = app.get("status", "unknown")
            summary["by_status"][status] = summary["by_status"].get(status, 0) + 1

        return {"application_update": summary, "error": ""}

    elif sub_action == "detail":
        application_id = params.get("application_id", "")
        app = get_application(application_id)
        if not app:
            return {"error": "Application not found", "application_update": {}}
        events = get_application_events(application_id)
        app["events"] = events
        return {"application_update": app, "error": ""}

    return {"error": f"Unknown sub_action: {sub_action}", "application_update": {}}
