import asyncio
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.agents.planner import run_planner
from backend.agents.researcher import run_researcher
from backend.agents.memory_agent import save_agent_output, retrieve_historical_context
from backend.agents.reviewer import run_reviewer
from backend.database import save_memory

# Global dictionary to track workflow states
ACTIVE_WORKFLOWS: Dict[str, Dict[str, Any]] = {}

# Dictionary to hold asyncio queues for active SSE streams
WORKFLOW_QUEUES: Dict[str, asyncio.Queue] = {}

class WorkflowEngine:
    @staticmethod
    def create_workflow(prompt: str) -> str:
        """Initializes a new workflow record and event queue."""
        workflow_id = str(uuid.uuid4())
        ACTIVE_WORKFLOWS[workflow_id] = {
            "id": workflow_id,
            "prompt": prompt,
            "status": "initializing",
            "tasks": [],
            "logs": [],
            "active_agent": "None",
            "current_step": 0,
            "total_steps": 6,  # 1. Planner, 2. Memory Pull, 3. Research, 4. Research Index, 5. Review, 6. Strategy Index
            "final_output": "",
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        WORKFLOW_QUEUES[workflow_id] = asyncio.Queue()
        return workflow_id

    @staticmethod
    async def push_event(workflow_id: str, event_type: str, data: Dict[str, Any]):
        """Pushes an execution event to the workflow queue for real-time SSE streaming."""
        queue = WORKFLOW_QUEUES.get(workflow_id)
        if queue:
            payload = {
                "event": event_type,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": data
            }
            await queue.put(payload)

    @staticmethod
    def log_message(workflow_id: str, sender: str, message: str, level: str = "info"):
        """Appends a log line to the workflow history."""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender": sender,
            "message": message,
            "level": level
        }
        if workflow_id in ACTIVE_WORKFLOWS:
            ACTIVE_WORKFLOWS[workflow_id]["logs"].append(log_entry)
        print(f"[{sender.upper()}] {message}")

    @classmethod
    async def execute_workflow(cls, workflow_id: str):
        """Orchestrates the sequential multi-agent execution pipeline in background threads."""
        if workflow_id not in ACTIVE_WORKFLOWS:
            return
            
        workflow = ACTIVE_WORKFLOWS[workflow_id]
        prompt = workflow["prompt"]
        workflow["status"] = "running"
        
        cls.log_message(workflow_id, "System", "Starting FounderOS Startup Workflow...")
        await cls.push_event(workflow_id, "workflow_started", {
            "id": workflow_id,
            "prompt": prompt,
            "total_steps": workflow["total_steps"]
        })

        try:
            # ----------------------------------------------------
            # STEP 1: PLANNER AGENT
            # ----------------------------------------------------
            workflow["active_agent"] = "Planner Agent"
            workflow["current_step"] = 1
            cls.log_message(workflow_id, "Planner Agent", "Decomposing founder requirements into subtasks...")
            await cls.push_event(workflow_id, "agent_active", {"agent": "Planner Agent", "step": 1})
            
            # Execute planner in worker thread to prevent blocking FastAPI
            plan_data = await asyncio.to_thread(run_planner, prompt)
            tasks = plan_data.get("tasks", [])
            workflow["tasks"] = tasks
            
            cls.log_message(workflow_id, "Planner Agent", f"Generated {len(tasks)} subtasks successfully.")
            await cls.push_event(workflow_id, "tasks_initialized", {"tasks": tasks})

            # ----------------------------------------------------
            # STEP 2: MEMORY AGENT (Semantic Retrieval)
            # ----------------------------------------------------
            workflow["active_agent"] = "Memory Agent"
            workflow["current_step"] = 2
            cls.log_message(workflow_id, "Memory Agent", "Searching Qdrant for past related startup documents...")
            await cls.push_event(workflow_id, "agent_active", {"agent": "Memory Agent", "step": 2})
            
            past_context = await asyncio.to_thread(retrieve_historical_context, prompt)
            if past_context:
                cls.log_message(workflow_id, "Memory Agent", f"Found matching vectors in Qdrant. Injecting context.")
            else:
                cls.log_message(workflow_id, "Memory Agent", "No relevant past memory matches found. Starting with clean context.")
            
            await cls.push_event(workflow_id, "memory_pulled", {"context_found": bool(past_context)})

            # ----------------------------------------------------
            # STEP 3: RESEARCH AGENT
            # ----------------------------------------------------
            workflow["active_agent"] = "Research Agent"
            workflow["current_step"] = 3
            cls.log_message(workflow_id, "Research Agent", "Analyzing market trends and indexing competitor strategies...")
            await cls.push_event(workflow_id, "agent_active", {"agent": "Research Agent", "step": 3})
            
            research_output = await asyncio.to_thread(run_researcher, prompt, past_context)
            
            # Update planner tasks board
            for task in workflow["tasks"]:
                if task.get("assignee") == "Researcher":
                    task["status"] = "completed"
            
            cls.log_message(workflow_id, "Research Agent", "Market and competitor intelligence report compiled.")
            await cls.push_event(workflow_id, "research_completed", {
                "report": research_output,
                "tasks": workflow["tasks"]
            })

            # ----------------------------------------------------
            # STEP 4: MEMORY AGENT (Index Research)
            # ----------------------------------------------------
            workflow["active_agent"] = "Memory Agent"
            workflow["current_step"] = 4
            cls.log_message(workflow_id, "Memory Agent", "Saving market intelligence report in Qdrant collections...")
            await cls.push_event(workflow_id, "agent_active", {"agent": "Memory Agent", "step": 4})
            
            await asyncio.to_thread(
                save_agent_output,
                collection="market_research",
                content=research_output,
                startup_name=prompt[:30],
                doc_type="Market Research"
            )
            
            cls.log_message(workflow_id, "Memory Agent", "Indexed research report in 'market_research' vector database collection.")
            await cls.push_event(workflow_id, "memory_indexed", {"collection": "market_research"})

            # ----------------------------------------------------
            # STEP 5: REVIEWER AGENT
            # ----------------------------------------------------
            workflow["active_agent"] = "Reviewer Agent"
            workflow["current_step"] = 5
            cls.log_message(workflow_id, "Reviewer Agent", "Polishing copy and synthesizing final executive proposal...")
            await cls.push_event(workflow_id, "agent_active", {"agent": "Reviewer Agent", "step": 5})
            
            tasks_str = json.dumps(workflow["tasks"], indent=2)
            final_report = await asyncio.to_thread(run_reviewer, prompt, research_output, tasks_str)
            
            # Update reviewer task status
            for task in workflow["tasks"]:
                if task.get("assignee") == "Reviewer":
                    task["status"] = "completed"
                    
            workflow["final_output"] = final_report
            
            cls.log_message(workflow_id, "Reviewer Agent", "Startup executive roadmap and launch plan completed.")
            await cls.push_event(workflow_id, "review_completed", {
                "final_output": final_report,
                "tasks": workflow["tasks"]
            })

            # ----------------------------------------------------
            # STEP 6: MEMORY AGENT (Index Final Output & Workflow)
            # ----------------------------------------------------
            workflow["active_agent"] = "Memory Agent"
            workflow["current_step"] = 6
            cls.log_message(workflow_id, "Memory Agent", "Storing final strategy profile and logging workflow state in Qdrant...")
            await cls.push_event(workflow_id, "agent_active", {"agent": "Memory Agent", "step": 6})
            
            # Store in 'strategies'
            await asyncio.to_thread(
                save_agent_output,
                collection="strategies",
                content=final_report,
                startup_name=prompt[:30],
                doc_type="Launch Strategy"
            )
            # Store in 'reports'
            await asyncio.to_thread(
                save_agent_output,
                collection="reports",
                content=final_report,
                startup_name=prompt[:30],
                doc_type="Executive Proposal"
            )
            # Log completed workflow state
            workflow_log = {
                "prompt": prompt,
                "tasks": workflow["tasks"],
                "completed_at": datetime.utcnow().isoformat() + "Z"
            }
            await asyncio.to_thread(
                save_memory,
                collection="workflows",
                text=json.dumps(workflow_log),
                metadata={"startup_name": prompt[:30], "timestamp": datetime.utcnow().isoformat() + "Z", "type": "Workflow Record"}
            )
            
            # Update memory task
            for task in workflow["tasks"]:
                if task.get("assignee") == "Memory":
                    task["status"] = "completed"
            
            workflow["status"] = "completed"
            workflow["active_agent"] = "None"
            
            cls.log_message(workflow_id, "System", "Startup OS execution completed successfully!")
            await cls.push_event(workflow_id, "workflow_completed", {
                "final_output": final_report,
                "tasks": workflow["tasks"]
            })

        except Exception as e:
            workflow["status"] = "failed"
            workflow["active_agent"] = "None"
            cls.log_message(workflow_id, "System", f"Workflow execution failed: {e}", level="error")
            await cls.push_event(workflow_id, "workflow_failed", {"error": str(e)})
            
        finally:
            # Clean up queue when done
            # We keep it for a few seconds to let any finishing streams read final events
            await asyncio.sleep(5)
            if workflow_id in WORKFLOW_QUEUES:
                del WORKFLOW_QUEUES[workflow_id]
