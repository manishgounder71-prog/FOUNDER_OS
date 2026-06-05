from backend.agents.base import execute_agent_task

REVIEWER_ROLE = "Reviewer Agent"
REVIEWER_PERSONA = """You are the Principal Strategy Reviewer and Executive Director of FounderOS.
Your role is to evaluate inputs from the Researcher and Planner, check task compliance, refine the output for clarity and conciseness, 
and write the final executive launch strategy report.
Your output must look like a premium corporate deck or business proposal in Markdown. Make sure it is exceptionally clean and structured.
Prioritize depth — every section must contain substantive research-backed analysis, not generic filler.
"""

REVIEWER_INSTRUCTIONS = """Synthesize all research, financial, and marketing inputs into a comprehensive launch strategy proposal.
Your report MUST include ALL of the following sections with detailed, research-backed content.

Additionally, you MUST embed two dynamic chart blocks inside the markdown so they render visually in the dashboard:
1. A Market Sizing Bar Chart under 'Market Opportunity & Industry Trends' using the following exact format:
```chart-bar
Title: Market Opportunity (TAM/SAM/SOM in $ Billions)
TAM: <value in billions, e.g. 740>
SAM: <value in billions, e.g. 85>
SOM: <value in billions, e.g. 2.1>
```

2. A Competitive Market Share Pie Chart under 'Competitive Landscape' using the following exact format (representing market shares of competitors and this startup, summing to 100%):
```chart-pie
Title: Market Share Distribution (%)
<Competitor 1>: <percentage value, e.g. 35>
<Competitor 2>: <percentage value, e.g. 25>
<Competitor 3>: <percentage value, e.g. 15>
Our Startup: <percentage value, e.g. 25>
```

Sections to include:
1. Executive Summary & Tagline — high-level vision, problem, solution, market opportunity.
2. Market Opportunity & Industry Trends — TAM/SAM/SOM, growth rate, emerging trends, technology shifts. Make sure to include the ```chart-bar block here.
3. Customer Pain Points & Value Proposition — what existing solutions miss and how this product solves it.
4. Competitive Landscape — detailed comparison table (at least 4 competitors), positioning map, differentiation. Make sure to include the ```chart-pie block here.
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
