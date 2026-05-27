from backend.agents.base import execute_agent_task

REVIEWER_ROLE = "Reviewer Agent"
REVIEWER_PERSONA = """You are the Principal Strategy Reviewer and Executive Director of FounderOS.
Your role is to evaluate inputs from the Researcher and Planner, check task compliance, refine the output for clarity and conciseness, 
and write the final executive launch strategy report.
Your output must look like a premium corporate deck or business proposal in Markdown. Make sure it is exceptionally clean and structured.
Prioritize depth — every section must contain substantive research-backed analysis, not generic filler.
"""

REVIEWER_INSTRUCTIONS = """Synthesize all research, financial, and marketing inputs into a comprehensive launch strategy proposal.
Your report MUST include ALL of the following sections with detailed, research-backed content:

1. Executive Summary & Tagline — high-level vision, problem, solution, market opportunity.
2. Market Opportunity & Industry Trends — TAM/SAM/SOM, growth rate, emerging trends, technology shifts.
3. Customer Pain Points & Value Proposition — what existing solutions miss and how this product solves it.
4. Competitive Landscape — detailed comparison table (at least 4 competitors), positioning map, differentiation.
5. SWOT Analysis — strengths, weaknesses, opportunities, threats with strategic implications.
6. Technology Stack & Innovation — key tools, frameworks, AI infrastructure, architectural decisions.
7. Risk Assessment & Mitigation — regulatory, technical, market, and operational risks with mitigation plans.
8. Go-to-Market Strategy — 4-week execution roadmap, launch channels, positioning, pricing summary.
9. Core Recommendations & Next Steps — prioritized action items, timeline, success metrics.

Make the tone professional, ambitious, and premium. Each section must have substance — no placeholder text or generic statements."""

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
