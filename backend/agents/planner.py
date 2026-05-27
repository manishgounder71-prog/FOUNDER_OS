import json
from backend.agents.base import execute_agent_task

PLANNER_ROLE = "Planner Agent"
PLANNER_PERSONA = """You are the Lead Systems Planner and Startup Architect of FounderOS. 
Your role is to understand user goals, decompose tasks, assign subtasks to appropriate agents (Researcher, Financial, Content, Reviewer, Memory), and organize workflows.
You must always output a structured JSON response containing a list of tasks.

JSON format to return:
{
  "tasks": [
    {
      "id": "t1",
      "name": "Decompose task details",
      "status": "pending",
      "assignee": "Researcher"
    }
  ]
}
Do not write anything else. Return only the raw JSON.
"""

PLANNER_INSTRUCTIONS = """Analyze the user's startup idea and generate a workflow plan.
Decompose the execution into exactly 4-5 specialized tasks assigned to the 'Researcher', 'Financial', 'Content', 'Reviewer', or 'Memory' agents.
Ensure the response is valid JSON."""

def run_planner(prompt: str) -> dict:
    """Invokes the Planner Agent to decompose the founder's prompt into subtasks."""
    raw_output = execute_agent_task(
        role=PLANNER_ROLE,
        persona=PLANNER_PERSONA,
        instructions=PLANNER_INSTRUCTIONS,
        input_data=prompt
    )
    
    # Try parsing output
    try:
        # Strip potential markdown formatting
        cleaned = raw_output.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        data = json.loads(cleaned)
        if "tasks" in data:
            return data
    except Exception as e:
        print(f"Error parsing planner output as JSON: {e}. Output was:\n{raw_output}")
        
    # Default structural fallback
    return {
        "tasks": [
            {"id": "t1", "name": f"Decompose competitor landscape for: {prompt}", "status": "pending", "assignee": "Researcher"},
            {"id": "t2", "name": f"Calculate operating runway and define pricing tiers", "status": "pending", "assignee": "Financial"},
            {"id": "t3", "name": f"Draft landing page slogans and social media copies", "status": "pending", "assignee": "Content"},
            {"id": "t4", "name": f"Draft custom GTM launch strategy", "status": "pending", "assignee": "Reviewer"},
            {"id": "t5", "name": f"Store execution vectors in Qdrant collections", "status": "pending", "assignee": "Memory"}
        ]
    }
