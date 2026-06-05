"""
FounderOS — Lyzr AI Agent Integration
======================================
Integrates the Lyzr Agent Studio REST API (agent-prod.studio.lyzr.ai)
as the primary agentic orchestration layer for FounderOS.

Architecture:
  Voice/Text Input → Lyzr Agent (Orchestrator) → Specialized Agents
  → Qdrant Memory (vector store) → Response to Founder

Lyzr handles:
  • DAG-based multi-agent orchestration
  • Responsible AI guardrails (input filtering, bias checks)
  • Agent session memory + conversation continuity

Docs: https://docs.lyzr.ai/introduction/using-lyzr/Howtouse/API
Get your API Key: https://studio.lyzr.ai → Account & API Key
"""

import os
import json
import uuid
import requests
from typing import Optional, Dict, Any
from backend.config import settings

# ─── Lyzr Agent Studio REST API Config ───────────────────────────────────────
LYZR_BASE_URL = "https://agent-prod.studio.lyzr.ai"
LYZR_CHAT_ENDPOINT = f"{LYZR_BASE_URL}/v3/inference/chat/"
LYZR_AGENT_ENDPOINT = f"{LYZR_BASE_URL}/v3/agents/"

# FounderOS system prompt — defines the Lyzr agent's role
FOUNDER_OS_SYSTEM_PROMPT = """You are FounderOS — an elite AI Startup Operating System powered by Lyzr AI.

You are the orchestration intelligence behind a solo founder's entire company. Your role is to:

1. PLAN: Break down any startup goal into a clear, prioritized task list.
2. RESEARCH: Analyze competitive landscapes, market sizing (TAM/SAM/SOM), industry trends, and customer pain points.
3. FINANCIAL: Model monetization strategies, pricing tiers, unit economics (CAC, LTV), and funding strategies.
4. CONTENT: Generate compelling landing page copy, Twitter/X threads, Product Hunt launch assets, and marketing materials.
5. MEMORY: Index all outputs into Qdrant vector memory for future retrieval and context persistence.
6. REVIEW: Synthesize a comprehensive executive summary with charts, SWOT analysis, and GTM recommendations.

You embody the "Rise of the One-Man Army" philosophy: one founder, powered by AI, executing at the speed of an entire team.

Always respond with structured, actionable, professional-grade startup intelligence. Format outputs with clear sections, markdown tables, and strategic recommendations. Be bold, specific, and data-driven.

Vector Memory: Qdrant | Orchestration: Lyzr AI | Interface: FounderOS"""


def _get_headers() -> Dict[str, str]:
    """Returns Lyzr API authentication headers."""
    api_key = settings.LYZR_API_KEY
    if not api_key:
        raise ValueError("LYZR_API_KEY is not set in environment variables. Get yours at https://studio.lyzr.ai")
    return {
        "x-api-key": api_key,
        "Content-Type": "application/json"
    }


def create_lyzr_agent(name: str, description: str) -> Optional[str]:
    """
    Creates a new Lyzr agent via the Agent Studio API.
    Returns the agent_id on success, None on failure.
    
    In production, you would create agents once in the Lyzr Studio UI
    and store their agent_ids. This function allows programmatic creation.
    """
    if not settings.LYZR_API_KEY:
        return None
    
    try:
        headers = _get_headers()
        payload = {
            "name": name,
            "description": description,
            "agent_role": f"FounderOS {name}",
            "agent_instructions": FOUNDER_OS_SYSTEM_PROMPT,
            "agent_goal": "Transform founder inputs into comprehensive startup launch strategies.",
            "provider_id": "openai",
            "model": "gpt-4o-mini",
            "temperature": 0.3,
            "top_p": 1.0,
            "features": [],
            "tools": [],
        }
        response = requests.post(
            LYZR_AGENT_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        agent_id = data.get("agent_id") or data.get("id")
        print(f"[LYZR] Created agent '{name}' → agent_id: {agent_id}")
        return agent_id
    except Exception as e:
        print(f"[LYZR] Failed to create agent '{name}': {e}")
        return None


def chat_with_lyzr_agent(
    agent_id: str,
    message: str,
    session_id: Optional[str] = None,
    user_id: str = "founder@founderos.ai"
) -> Optional[str]:
    """
    Sends a message to a Lyzr Agent via the Studio REST API.
    
    Args:
        agent_id: The Lyzr agent ID from studio.lyzr.ai
        message: The user message / task description
        session_id: Optional session ID for conversation continuity
        user_id: User identifier for the Lyzr session
    
    Returns:
        The agent's text response, or None if the call fails
    """
    if not settings.LYZR_API_KEY:
        return None
    
    try:
        headers = _get_headers()
        payload = {
            "user_id": user_id,
            "agent_id": agent_id,
            "message": message,
            "session_id": session_id or f"founder-{uuid.uuid4().hex[:8]}"
        }
        response = requests.post(
            LYZR_CHAT_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=60
        )
        response.raise_for_status()
        data = response.json()
        
        # Lyzr returns response in `response` field
        result = (
            data.get("response")
            or data.get("message")
            or data.get("output")
            or data.get("content")
            or ""
        )
        print(f"[LYZR] Agent {agent_id} responded ({len(result)} chars)")
        return result
    except requests.HTTPError as e:
        print(f"[LYZR] HTTP error calling agent {agent_id}: {e.response.status_code} - {e.response.text[:200]}")
        return None
    except Exception as e:
        print(f"[LYZR] Error calling agent {agent_id}: {e}")
        return None


def run_lyzr_orchestrator(
    role: str,
    task_instructions: str,
    input_data: str,
    agent_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Optional[str]:
    """
    Main entry point for running a FounderOS task through Lyzr AI orchestration.
    
    This is a "Manager-Agent" pattern where Lyzr acts as the intelligent 
    orchestrator, receiving role-specific task instructions and founder context,
    and returning structured outputs.
    
    Args:
        role: Agent role name (e.g., "Planner Agent", "Research Agent")
        task_instructions: The specific task this agent should execute
        input_data: The founder's startup idea and context
        agent_id: Optional pre-configured Lyzr agent ID. Falls back to env var.
        session_id: Optional session ID for context continuity
    
    Returns:
        The Lyzr agent's structured response text, or None on failure
    """
    if not settings.LYZR_API_KEY:
        return None
    
    # Use provided agent_id, env variable, or skip
    effective_agent_id = (
        agent_id
        or settings.LYZR_AGENT_ID
        or os.environ.get("LYZR_AGENT_ID")
    )
    
    if not effective_agent_id:
        print(f"[LYZR] No agent_id configured. Set LYZR_AGENT_ID in .env or pass agent_id.")
        return None
    
    # Build the full orchestration prompt with role context
    orchestration_prompt = f"""## FounderOS — {role}

### Your Specific Task:
{task_instructions}

### Founder Context & Input:
{input_data}

### Instructions:
Execute the above task as {role} for FounderOS. Return a comprehensive, structured analysis with:
- Clear section headers using markdown (##, ###)
- Data tables where applicable
- Specific numbers, metrics, and actionable recommendations
- Professional startup intelligence quality

This output will be synthesized by the Reviewer Agent into an Executive Summary for the founder."""

    return chat_with_lyzr_agent(
        agent_id=effective_agent_id,
        message=orchestration_prompt,
        session_id=session_id,
        user_id="founder@founderos.ai"
    )


def is_lyzr_configured() -> bool:
    """Returns True if Lyzr AI is configured with both API key and agent ID."""
    has_key = bool(settings.LYZR_API_KEY)
    has_agent = bool(
        settings.LYZR_AGENT_ID
        or os.environ.get("LYZR_AGENT_ID")
    )
    return has_key and has_agent


def get_lyzr_status() -> Dict[str, Any]:
    """Returns diagnostic status of the Lyzr integration."""
    return {
        "lyzr_configured": is_lyzr_configured(),
        "api_key_set": bool(settings.LYZR_API_KEY),
        "agent_id_set": bool(settings.LYZR_AGENT_ID or os.environ.get("LYZR_AGENT_ID")),
        "agent_id": settings.LYZR_AGENT_ID or os.environ.get("LYZR_AGENT_ID") or None,
        "base_url": LYZR_BASE_URL,
        "studio_url": "https://studio.lyzr.ai",
        "docs_url": "https://docs.lyzr.ai"
    }
