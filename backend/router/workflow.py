from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
from backend.workflows.engine import WorkflowEngine, ACTIVE_WORKFLOWS, WORKFLOW_QUEUES

router = APIRouter(prefix="/api/workflow", tags=["workflow"])

class ExecuteWorkflowRequest(BaseModel):
    prompt: str
    mode: Optional[str] = "sequential"

@router.post("/execute")
async def execute_workflow(
    request: ExecuteWorkflowRequest,
    background_tasks: BackgroundTasks
):
    """Triggers an autonomous multi-agent startup workflow from a text prompt.
    Executes tasks in the background and returns a workflow_id.
    """
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Empty prompt")
        
    workflow_id = WorkflowEngine.create_workflow(prompt)
    
    # Run the workflow execution in the background
    if request.mode == "band":
        from backend.workflows.band_engine import BandWorkflowEngine
        background_tasks.add_task(BandWorkflowEngine.execute_workflow, workflow_id)
    else:
        background_tasks.add_task(WorkflowEngine.execute_workflow, workflow_id)
    
    return {
        "status": "triggered",
        "workflow_id": workflow_id,
        "prompt": prompt
    }

@router.get("/stream/{workflow_id}")
async def stream_workflow(workflow_id: str):
    """Server-Sent Events (SSE) endpoint to stream agent activities, 
    status modifications, and task completions in real-time.
    """
    if workflow_id not in ACTIVE_WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    async def event_generator():
        queue = WORKFLOW_QUEUES.get(workflow_id)
        if not queue:
            # If the background execution already completed, send a final state summary
            wf = ACTIVE_WORKFLOWS[workflow_id]
            completed_payload = {
                "event": "workflow_completed" if wf["status"] == "completed" else "workflow_failed",
                "timestamp": wf.get("created_at"),
                "data": {
                    "final_output": wf["final_output"],
                    "tasks": wf["tasks"]
                }
            }
            yield f"data: {json.dumps(completed_payload)}\n\n"
            return
            
        while True:
            try:
                # Wait for next event from the queue
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
                queue.task_done()
                
                # Terminate the stream on end-state events
                if event["event"] in ["workflow_completed", "workflow_failed"]:
                    break
            except asyncio.CancelledError:
                # Clean up if client leaves
                print(f"[SSE Stream] Client disconnected from workflow {workflow_id}")
                break
            except Exception as e:
                print(f"[SSE Stream] Error in stream loop: {e}")
                err_payload = {"event": "error", "timestamp": "", "data": {"error": str(e)}}
                yield f"data: {json.dumps(err_payload)}\n\n"
                break
                
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

@router.get("/status/{workflow_id}")
async def get_workflow_status(workflow_id: str):
    """Retrieves current cached state and logs for a specific workflow."""
    if workflow_id not in ACTIVE_WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return ACTIVE_WORKFLOWS[workflow_id]
