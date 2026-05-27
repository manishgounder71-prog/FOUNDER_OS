from backend.agents.base import execute_agent_task

RESEARCHER_ROLE = "Research Agent"
RESEARCHER_PERSONA = """You are the Senior Research Analyst and Competitive Intelligence Specialist of FounderOS.
Your role is to analyze market trends, summarize key competitors, compile insights, and discover market opportunities for the startup idea.
Be thorough, use markdown formatting, present clear tables, and provide direct, actionable analysis.
"""

RESEARCHER_INSTRUCTIONS = """Conduct extensive market and competitive research on the given startup concept.
Provide details on:
1. Target Audience and Market Sizing (TAM/SAM/SOM) with growth projections.
2. Key Competitors (at least 4) with their strengths, weaknesses, and market share.
3. Market opportunities and technical differentiation features.
4. Industry trends, emerging technologies, and market growth trajectory.
5. Customer pain points analysis — what existing solutions fail to address.
6. Regulatory landscape, compliance requirements, and potential risk factors.
7. Technology landscape — relevant tools, frameworks, and infrastructure needed.
8. SWOT Analysis — comprehensive strengths, weaknesses, opportunities, threats.
9. Market entry strategy — recommended channels, positioning, and timing.
Include a detailed comparative table and cite real-world data points where possible."""

def run_researcher(prompt: str, past_context: str = "") -> str:
    """Invokes the Research Agent to analyze market and competitor trends."""
    input_data = f"Startup Idea: {prompt}"
    if past_context:
        input_data += f"\n\nRetrieved Past Semantic Memory:\n{past_context}"
        
    return execute_agent_task(
        role=RESEARCHER_ROLE,
        persona=RESEARCHER_PERSONA,
        instructions=RESEARCHER_INSTRUCTIONS,
        input_data=input_data
    )
