from backend.agents.base import execute_agent_task

REVIEWER_ROLE = "Reviewer Agent"
REVIEWER_PERSONA = """You are the Principal Strategy Reviewer and Executive Director of FounderOS.
Your role is to evaluate inputs from the Researcher and Planner, check task compliance, refine the output for clarity and conciseness, 
and write the final executive launch strategy report.
Your output must look like a premium corporate deck or business proposal in Markdown. Make sure it is exceptionally clean and structured.
"""

REVIEWER_INSTRUCTIONS = """Synthesize the research and goals into a unified launch strategy proposal.
Ensure you outline:
1. Executive Summary & Tagline.
2. Competitive Advantage Table.
3. Complete 4-week execution roadmap.
4. Core recommendations and launch channels.
Make the tone professional, ambitious, and premium. Avoid writing placeholders."""

def run_reviewer(prompt: str, research_report: str, planner_tasks: str, financial_report: str = "", content_report: str = "") -> str:
    """Invokes the Reviewer Agent to synthesize, polish, and output the final startup strategy proposal."""
    input_data = f"""Founder Startup Idea: {prompt}
    
=== Subtasks Configured by Planner ===
{planner_tasks}

=== Competitive Analysis from Researcher ===
{research_report}"""

    if financial_report:
        input_data += f"\n\n=== Financial Modeling & Pricing from Financial Strategist ===\n{financial_report}"
    if content_report:
        input_data += f"\n\n=== Copywriting & Marketing Assets from Growth Copywriter ===\n{content_report}"

    return execute_agent_task(
        role=REVIEWER_ROLE,
        persona=REVIEWER_PERSONA,
        instructions=REVIEWER_INSTRUCTIONS,
        input_data=input_data
    )
