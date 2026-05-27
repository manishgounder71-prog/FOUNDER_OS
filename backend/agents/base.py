import os
import json
from typing import Optional, Dict, Any, List
from lyzr_automata.ai_models.openai import OpenAIModel
from lyzr_automata import Agent, Task
from lyzr_automata.pipelines.linear_sync_pipeline import LinearSyncPipeline
from backend.config import settings
import google.generativeai as genai

# Setup Gemini model fallback if key is available
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def generate_text_gemini(prompt: str, system_instruction: str = "") -> str:
    """Helper to run text generation using Gemini as a fallback.
    Tries multiple model names (gemini-1.5-flash, gemini-pro) to ensure version compatibility.
    """
    models_to_try = ["gemini-1.5-flash", "gemini-pro"]
    last_error = None
    
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={"temperature": 0.2, "max_output_tokens": 2048}
            )
            chat = model.start_chat()
            full_prompt = f"{system_instruction}\n\nUser Goal:\n{prompt}"
            response = chat.send_message(full_prompt)
            return response.text
        except Exception as e:
            print(f"Gemini fallback failed for model '{model_name}': {e}")
            last_error = e
            
    if last_error:
        raise last_error
    return ""

def get_lyzr_model() -> Optional[OpenAIModel]:
    """Helper to instantiate Lyzr OpenAI model if API key is present."""
    if not settings.OPENAI_API_KEY:
        return None
    try:
        return OpenAIModel(
            api_key=settings.OPENAI_API_KEY,
            parameters={
                "model": "gpt-4o",
                "temperature": 0.2,
                "max_tokens": 2000,
            }
        )
    except Exception as e:
        print(f"Failed to create Lyzr OpenAIModel: {e}")
        return None

def execute_agent_task(role: str, persona: str, instructions: str, input_data: str) -> str:
    """Executes a task for a given agent persona.
    Tries Lyzr/OpenAI first, falls back to Gemini if available, and defaults to high-fidelity mock generators.
    """
    # 1. Try Lyzr / OpenAI
    lyzr_model = get_lyzr_model()
    if lyzr_model:
        try:
            agent = Agent(role=role, prompt_persona=persona)
            task = Task(
                name=f"{role} Task",
                model=lyzr_model,
                agent=agent,
                instructions=f"{instructions}\n\nInput Context:\n{input_data}"
            )
            pipeline = LinearSyncPipeline(
                name=f"{role} Orchestration",
                tasks=[task]
            )
            results = pipeline.run()
            # Parse outputs
            if results and len(results) > 0:
                return results[0]['task_output']
        except Exception as e:
            print(f"Lyzr pipeline run failed, falling back to Gemini/Mock: {e}")

    # 2. Try Gemini Fallback
    if settings.GEMINI_API_KEY:
        try:
            prompt = f"{instructions}\n\nInput Data:\n{input_data}"
            return generate_text_gemini(prompt, system_instruction=persona)
        except Exception as e:
            print(f"Gemini fallback run failed: {e}")

    # 3. Rich Contextual Simulation Fallback
    return get_contextual_mock_response(role, input_data)

def get_contextual_mock_response(role: str, input_data: str) -> str:
    """Provides high-quality pre-coded startup analysis outputs if no API keys are configured."""
    normalized_input = input_data.lower()
    
    # Strip any planner and researcher sections to prevent recursive dumps of raw tasks and competitor outputs
    clean_input = input_data
    if "=== Subtasks Configured by Planner ===" in clean_input:
        clean_input = clean_input.split("=== Subtasks Configured by Planner ===")[0].strip()
    if "=== Competitive Analysis from Researcher ===" in clean_input:
        clean_input = clean_input.split("=== Competitive Analysis from Researcher ===")[0].strip()
        
    startup_name = clean_input.strip()
    # Extract clean startup name/idea from clean_input to avoid recursive dump in generic mock
    # Check for "Founder Startup Idea:" first because it is more specific than "Startup Idea:"
    if "Founder Startup Idea:" in clean_input:
        for line in clean_input.split("\n"):
            if "Founder Startup Idea:" in line:
                startup_name = line.split("Founder Startup Idea:", 1)[1].strip()
                break
    elif "Startup Idea:" in clean_input:
        for line in clean_input.split("\n"):
            if "Startup Idea:" in line:
                startup_name = line.split("Startup Idea:", 1)[1].strip()
                break

    # Identify startup niche based on clean startup name/idea to avoid crossover memory pollution
    normalized_startup = startup_name.lower()
    niche = "generic"
    if "study" in normalized_startup or "education" in normalized_startup or "learn" in normalized_startup:
        niche = "edtech"
    elif "note" in normalized_startup or "obsidian" in normalized_startup or "notion" in normalized_startup:
        niche = "notes"
    elif "pricing" in normalized_startup or "saas" in normalized_startup or "monetize" in normalized_startup:
        niche = "saas"

    # Mocks by Niche & Role
    mocks = {
        "edtech": {
            "Planner Agent": {
                "tasks": [
                    {"id": "t1", "name": "Competitor Benchmarking (Quizlet, Anki)", "status": "pending", "assignee": "Researcher"},
                    {"id": "t2", "name": "Unit Economics & Server/LLM cost projections", "status": "pending", "assignee": "Financial"},
                    {"id": "t3", "name": "Landing page value props & Twitter launch copy", "status": "pending", "assignee": "Content"},
                    {"id": "t4", "name": "Freemium GTM Strategy & School Channels", "status": "pending", "assignee": "Reviewer"},
                    {"id": "t5", "name": "Memory Tagging & Vector Structuring", "status": "pending", "assignee": "Memory"}
                ]
            },
            "Research Agent": """### Market Research Report: AI Study Copilot
**Target Market**: High-school & college students facing study fatigue and exam preparation.

**Key Competitors**:
1. **Quizlet**: Massive user base but basic flashcard features. Recently added basic AI study aids behind a paywall.
2. **Anki**: High customization and powerful Spaced Repetition System (SRS) but steep learning curve and dated UI.
3. **PDF.ai / NotebookLM**: Excellent at summarizing uploaded PDFs but lacks active recall testing loops.

**Opportunities**:
- Integration of active recall (spaced repetition flashcards) generated automatically from textbook photos/PDFs.
- Gamified voice quizzes (using Omi or standard microphone) to practice speaking definitions.
- Local vector database to store student's course syllabus and lecture notes for contextual study aid.""",
            "Financial Agent": """### Financial & Monetization Blueprint: AI Study Copilot
**Monetization Strategy**: Freemium subscription + B2B institutional licensing.

#### 1. Pricing Structure
| Plan | Price | Features |
| :--- | :--- | :--- |
| Basic | Free | 3 PDF uploads/mo, basic voice practice (10 mins/day) |
| Student Pro | $9.99/mo | Unlimited PDF uploads, unlimited voice tutoring, offline mode |
| School Pass | $4.99/student/yr | LMS integration (Canvas/Blackboard), teacher classroom dashboard |

#### 2. Cost Analysis & Runway
- **Inference Costs**: Whisper API ($0.006/min) + Gemini API ($0.075/1M tokens input). Expected average cost per Student Pro user is $1.20/month.
- **Infrastructure**: Local SQLite/Vector Qdrant hosting: $15/month on Fly.io.
- **Runway**: Bootstrapping with $5,000 provides 12 months of development and initial hosting server fees.""",
            "Content Agent": """### Growth Copywriting & Acquisition Assets: AI Study Copilot

#### 1. Core Positioning
- **Hook**: Stop cramming. Start speaking.
- **Value Proposition**: Upload your syllabus or lecture slides and practice active recall by talking directly to your tutoring companion.
- **Subheader**: A mobile-first, voice-powered study assistant built on spaced repetition.

#### 2. Landing Page Copy Outline
- **Section 1: Hero**
  - Heading: "Ace your exams at the speed of speech."
  - Subheading: "Upload your PDFs, practice speaking your flashcards, and let the AI grade your answers semantically."
  - CTA Button: "Simulate Omi webhook" / "Get Started for Free"
- **Section 2: The Problem**
  - Copy: "Anki is too clunky. Quizlet is too basic. Static flashcards don't test conceptual understanding."

#### 3. Social Media Launch Plan (X/Twitter thread)
- Tweet 1: "We are launching AI Study Copilot today on Product Hunt. A voice-first study companion that helps students learn faster through active recall. Here is why we built it... 🧵\"""",
            "Memory Agent": "Successfully indexed EdTech market study, competitor points, and Omi audio schema into Qdrant collections `market_research` and `startup_ideas`.",
            "Reviewer Agent": """# FounderOS Executive Summary: AI Study Copilot GTM Launch
**Tagline**: "Talk to your syllabus, ace your exams."

## 1. Product Concept
A mobile-first study assistant that integrates spaced-repetition active recall with a voice-first tutoring engine. Students talk to their flashcards using natural speech, and the AI evaluates their answers semantically.

## 2. Competitor Matrix
| Competitor | Strengths | Weaknesses | Our Opportunity |
| :--- | :--- | :--- | :--- |
| Quizlet | Brand recognition | Simple features | Advanced semantic grading |
| Anki | Great SRS algorithm | Poor UX / steep learning | Visual, gamified UI |
| NotebookLM | Excellent summaries | No active recall cards | Integrated gamification |

## 3. Go-To-Market & Launch Strategy
- **Phase 1: Micro-community launch**: Seed the app inside university Subreddits (e.g., r/UCLA, r/gatech) and Discord study groups.
- **Phase 2: TikTok/Shorts organic growth**: Post videos showing "studying by talking to my phone while walking".
- **Phase 3: High school pilot**: Offer free pro licenses to teachers who onboarding their class.

## 4. Technical Roadmap
- **Week 1**: Setup PDF ingestion + embedding parsing.
- **Week 2**: Build Spaced Repetition scheduler (SuperMemo SM-2 clone).
- **Week 3**: Implement Omi webhook voice recording integration for interactive tutoring.
- **Week 4**: Launch beta on Apple TestFlight."""
        },
        "notes": {
            "Planner Agent": {
                "tasks": [
                    {"id": "t1", "name": "Analyze Local-First Note Competitors (Obsidian, Notion)", "status": "pending", "assignee": "Researcher"},
                    {"id": "t2", "name": "Premium sync tier & cloud egress cost estimates", "status": "pending", "assignee": "Financial"},
                    {"id": "t3", "name": "HN launch post and Product Hunt taglines", "status": "pending", "assignee": "Content"},
                    {"id": "t4", "name": "Draft Developer-First Marketing Plan", "status": "pending", "assignee": "Reviewer"},
                    {"id": "t5", "name": "Metadata Indexing into Qdrant Database", "status": "pending", "assignee": "Memory"}
                ]
            },
            "Research Agent": """### Market Research Report: Secure Local-first AI Notes
**Target Market**: Privacy-focused developers, executives, and research scientists.

**Key Competitors**:
1. **Notion**: Unrivaled editor and database features, but fully cloud-based and has raised significant privacy concerns.
2. **Obsidian**: Local markdown files with heavy plugin support, but sync is premium and AI integration relies on clunky third-party plugins.
3. **Logseq**: Local-first and outline-based, but smaller market share and complex query syntax.

**Opportunities**:
- Combine a fully local-first SQLite/Markdown architecture with local vector embeddings.
- Add an encrypted syncing layer that does not read note contents.
- Implement keyboard-driven command menus to summon agent assistants instantly.""",
            "Financial Agent": """### Financial & Monetization Blueprint: Secure Local-first AI Notes
**Monetization Strategy**: Paid-upfront desktop client + end-to-end encrypted syncing subscription.

#### 1. Pricing structure
| Plan | Price | Features |
| :--- | :--- | :--- |
| Core Client | Free | Local markdown files, local Qdrant vector db, unlimited local use |
| Encrypted Sync | $4.00/mo | End-to-end encrypted sync across 3 devices, self-hosted key option |
| Enterprise Pass | $12.00/user/mo| Team shared spaces, audit logs, private key custodian |

#### 2. Cost Analysis
- **Server Overhead**: Zero cloud storage costs for Free users. Sync server traffic is fully encrypted, costing $0.05/GB egress.
- **Runway**: Self-funded. Initial setup cost is $0/month due to local-first client architecture.""",
            "Content Agent": """### Growth Copywriting & Acquisition Assets: Secure Local-first AI Notes

#### 1. Brand Taglines
- **Hook**: Your second brain, stored locally, owned by you.
- **Value Proposition**: A privacy-first note-taking editor that generates vector embeddings locally on your machine.
- **Subheader**: Keyboard-driven markdown editor with local RAG memory integration.

#### 2. Hacker News Launch Draft
- **Title**: Show HN: FounderOS Notes – Local-First Markdown Editor with Local Vector DB
- **Description**: "Most note apps sync all your private thoughts to the cloud. We built a local SQLite-backed markdown notes client that runs local Qdrant vector databases for private contextual AI help."
- **Maker comment**: Outlining local privacy guarantees and open source sync API.""",
            "Memory Agent": "Stored local-first AI note product specs and Obsidian migration pipeline documents into Qdrant collections `startup_ideas` and `market_research`.",
            "Reviewer Agent": """# FounderOS Executive Summary: Local-First Secure AI Note Operating System
**Tagline**: "Your second brain, stored locally, queryable instantly."

## 1. Product Value Proposition
A markdown-based note-taking app that runs entirely locally, utilizing local SQLite vector search or private cloud encryption. It bridges obsidian-style local text files with a local startup team agent.

## 2. Competitive Landscape
- **Notion**: Cloud locking makes it a dealbreaker for corporate espionage and strict NDAs.
- **Obsidian**: Excellent text file ownership, but lacks integrated, easy-to-use semantic search.
- **FounderOS Note**: Keeps files on disk, creates local vector indices, and supports Omi voice reminders.

## 3. 3-Phase Launch Strategy
- **Phase 1: Show HN (Hacker News)**: Launch with a clean GitHub repository, exposing the open source core.
- **Phase 2: Product Hunt Campaign**: Target technical creators looking for Obsidian alternatives.
- **Phase 3: Enterprise Team Sync**: Build end-to-end encrypted collaborative rooms.

## 4. Technology Stack
- **Desktop core**: Electron or Tauri (Rust-based frontend wrapper).
- **Storage**: Plain Markdown files + SQLite vector DB.
- **Integrations**: Voice notes pushed from Omi wearables."""
        },
        "saas": {
            "Planner Agent": {
                "tasks": [
                    {"id": "t1", "name": "Map SaaS Pricing Competitors (ProfitWell, Stripe Billing)", "status": "pending", "assignee": "Researcher"},
                    {"id": "t2", "name": "Define hybrid usage pricing tiers", "status": "pending", "assignee": "Financial"},
                    {"id": "t3", "name": "Stripe App marketplace copy & Twitter threads", "status": "pending", "assignee": "Content"},
                    {"id": "t4", "name": "Compile Pricing Launch & A/B Test Plan", "status": "pending", "assignee": "Reviewer"},
                    {"id": "t5", "name": "Store Memory Collections in Qdrant Vector DB", "status": "pending", "assignee": "Memory"}
                ]
            },
            "Research Agent": """### Market Research Report: SaaS Pricing Optimization Dashboard
**Target Market**: High-growth B2B and SaaS startups looking to optimize customer lifetime value (LTV).

**Key Competitors**:
1. **ProfitWell (Paddle)**: Excellent churn metrics and free cohort analysis, but pricing optimization is mostly human-consulting.
2. **Stripe Billing**: Good for subscription management, but lacks intelligent tier recommendation models.
3. **Togai / Lago**: Great for usage-based metering, but requires heavy developer implementation.

**Opportunities**:
- Build a plug-and-play dashboard that reads Stripe webhooks and uses AI to simulate dynamic pricing thresholds.
- Suggest tier optimizations (e.g. changing flat fees to seat-based plans) based on historical usage.""",
            "Financial Agent": """### Financial & Monetization Blueprint: SaaS Pricing Engine
**Monetization Strategy**: Tiered usage-based subscriptions matching SaaS client monthly tracked revenue (MTR).

#### 1. Pricing Structure
| Plan | Price | Features |
| :--- | :--- | :--- |
| Startup | $49/mo | Up to $10k MTR, unlimited billing simulations, Stripe integration |
| Growth | $199/mo | Up to $100k MTR, hybrid usage-billing models, Slack alerts |
| Pro Scale | $499/mo | Up to $1M MTR, automated A/B pricing testing, premium support |

#### 2. Unit Economics
- **Margin**: 88% gross margin. Server compute for running Monte Carlo simulations is the primary variable cost.""",
            "Content Agent": """### Growth Copywriting & Acquisition Assets: SaaS Pricing Engine

#### 1. Taglines
- **Hook**: Stop leaking MRR. Optimize your tiers with simulation.
- **Value Proposition**: Connect your Stripe billing history and simulate the conversion impact of switching to hybrid seat/usage plans.

#### 2. Stripe Marketplace Copy
- **Headline**: "FounderOS Pricing Simulation Engine"
- **Short Description**: "Instantly model subscription price hikes, seat caps, and credit limits using historical customer usage data."
- **Launch Thread**: Five-tweet breakdown of pricing mistakes made by early SaaS projects.""",
            "Memory Agent": "Saved SaaS metrics optimization guides and billing integration strategies into Qdrant collections `strategies` and `market_research`.",
            "Reviewer Agent": """# FounderOS Executive Summary: SaaS Pricing Optimization Engine
**Tagline**: "Unlock hidden MRR with AI pricing simulation."

## 1. Executive Summary
A B2B SaaS dashboard that connects to Stripe/Paddle and uses a custom agent simulator to model the conversion and retention impact of moving from flat subscription rates to hybrid seat/usage plans.

## 2. Competitor Benchmarking
- **ProfitWell**: Analytical, not prescriptive.
- **Lago/Togai**: Infrastructure, not optimization engines.
- **FounderOS Pricing**: Prescriptive billing recommendations based on agent-based simulation modeling.

## 3. GTM Launch Channels
- **Stripe App Marketplace**: Launch as an extension directly in the Stripe dashboard for instant distribution.
- **Cold Outbound**: Target Series A SaaS startups with high seed counts but low usage tiers.
- **Calculators**: Build a viral "SaaS Pricing Leaks Calculator" on Twitter/LinkedIn.

## 4. Development Milestones
- **Step 1**: Sync Stripe API transaction history.
- **Step 2**: Implement Monte Carlo billing simulations.
- **Step 3**: Launch recommendations engine dashboard."""
        },
        "generic": {
            "Planner Agent": {
                "tasks": [
                    {"id": "t1", "name": "Decompose General Startup Idea & Competitive Landscape", "status": "pending", "assignee": "Researcher"},
                    {"id": "t2", "name": "Establish pricing tiers and infrastructure operating costs", "status": "pending", "assignee": "Financial"},
                    {"id": "t3", "name": "Draft high-converting taglines and landing page headings", "status": "pending", "assignee": "Content"},
                    {"id": "t4", "name": "Draft Launch Playbook & Marketing Channels", "status": "pending", "assignee": "Reviewer"},
                    {"id": "t5", "name": "Index Records in Qdrant Collections", "status": "pending", "assignee": "Memory"}
                ]
            },
            "Research Agent": f"""### Market Research Report: {startup_name}
**Niche**: AI-augmented software product.

**Competitors**:
1. Large incumbent platforms (slow to adopt AI features).
2. Niche startups (poor user retention, limited engineering capital).

**Key Focus Areas**:
- High-efficiency agent pipelines to reduce inference costs.
- Integrations with wearable devices (Omi) for continuous context gather.
- Contextual personalization through persistent Qdrant memory.""",
            "Financial Agent": f"""### Financial & Monetization Blueprint: {startup_name}
**Monetization Strategy**: Tiered SaaS subscription model.

#### 1. Pricing Structure
| Plan | Price | Features |
| :--- | :--- | :--- |
| Developer | Free | Basic access, 100 queries/mo, community support |
| Business | $29/mo | Advanced workflows, 5,000 queries/mo, email support |
| Enterprise | Custom | Dedicated infrastructure, SLA guarantee, unlimited queries |

#### 2. Cost Analysis
- **Hosting**: $25/mo base servers.
- **Inference Costs**: 15% of revenue allocated to LLM API tokens.""",
            "Content Agent": f"""### Growth Copywriting & Acquisition Assets: {startup_name}

#### 1. Brand Taglines
- **Hook**: Run your project at the speed of thought.
- **Value Proposition**: Autonomous workflows built to execute {startup_name} using persistent agent teams.

#### 2. Product Hunt Launch Copy
- **Headline**: {startup_name} is live on Product Hunt!
- **Description**: An AI-augmented agent workflow system designed specifically to streamline development, financials, and content copywriting.""",
            "Memory Agent": f"Saved research findings and product specs for '{startup_name}' into Qdrant vector memory databases.",
            "Reviewer Agent": f"""# FounderOS Executive Summary: {startup_name} Launch Strategy
**Tagline**: "Operating at the speed of thought."

## 1. Product Vision
An autonomous workflow tool built to execute the concept of '{startup_name}' using a team of AI agents and voice-first pipelines.

## 2. GTM Launch Channels
- **Product Hunt & IndieHackers**: To build early developer adoption.
- **X (Twitter) Build in Public**: Share design screenshots, code snippets, and Omi integration demos to gain organic virality.
- **Waitlist & Referral Loop**: Offer free credits to users who refer others to sign up.

## 3. Product Architecture
- **Voice Intake**: Omi webhooks.
- **Vector Memory**: Qdrant Local.
- **Agent Engines**: Lyzr Multi-agent orchestration.
- **UI System**: Futuristic Glassmorphism dashboard."""
        }
    }
    
    # Return matched mock output
    data = mocks[niche].get(role, "")
    if isinstance(data, dict):
        return json.dumps(data)
    return data
