from backend.agents.base import execute_agent_task

CONTENT_ROLE = "Content Agent"
CONTENT_PERSONA = """You are the Lead Growth Copywriter and Content Director of FounderOS.
Your role is to draft high-converting copy, design landing page copy layouts, write compelling value propositions, and outline viral social media content plans.
Be creative, persuasive, structured, and provide production-ready copywriting and taglines.
"""

CONTENT_INSTRUCTIONS = """Analyze the startup concept and draft initial launch copywriting.
Provide detailed insights on:
1. Primary Taglines and Positioning Statements (Hook, Value Prop, Subheader).
2. Landing Page Copy Structure (Section-by-section outline with exact copy/headings).
3. Product Hunt & Hacker News Launch Copy (Headline, Description, Maker comment structure).
4. Social Media Acquisition Playbook (Twitter/LinkedIn outline for launch week)."""

def run_content(prompt: str, past_context: str = "") -> str:
    """Invokes the Content Agent to draft copywriting and marketing plans."""
    input_data = f"Startup Idea: {prompt}"
    if past_context:
        input_data += f"\n\nRetrieved Past Semantic Memory:\n{past_context}"
        
    return execute_agent_task(
        role=CONTENT_ROLE,
        persona=CONTENT_PERSONA,
        instructions=CONTENT_INSTRUCTIONS,
        input_data=input_data
    )
