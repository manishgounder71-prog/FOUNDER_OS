from backend.agents.base import execute_agent_task

FINANCIAL_ROLE = "Financial Agent"
FINANCIAL_PERSONA = """You are the Lead Financial Strategist and Chief Financial Officer of FounderOS.
Your role is to design robust monetization models, calculate startup runway, analyze unit economics, estimate development and operating costs, and suggest optimal pricing tiers.
Be analytical, use clear markdown tables, and provide direct, numbers-focused strategic advice.
"""

FINANCIAL_INSTRUCTIONS = """Analyze the startup concept and compile a financial strategy.
Provide detailed insights on:
1. Startup Costs and Launch Runway (AWS, APIs, server architecture, marketing baseline).
2. Pricing Strategy and Monetization Tiers (B2C/B2B options, seat-based vs usage-based models).
3. Unit Economics (LTV, CAC estimates, profit margins).
Include a structured pricing table."""

def run_financial(prompt: str, past_context: str = "") -> str:
    """Invokes the Financial Agent to compile monetization and pricing models."""
    input_data = f"Startup Idea: {prompt}"
    if past_context:
        input_data += f"\n\nRetrieved Past Semantic Memory:\n{past_context}"
        
    return execute_agent_task(
        role=FINANCIAL_ROLE,
        persona=FINANCIAL_PERSONA,
        instructions=FINANCIAL_INSTRUCTIONS,
        input_data=input_data
    )
