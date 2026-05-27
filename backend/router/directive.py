from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import json
from backend.directive_engine import DirectiveEngine, ACTIVE_DIRECTIVES, DIRECTIVE_QUEUES

router = APIRouter(prefix="/api/directive", tags=["directive"])

class ResearchRequest(BaseModel):
    query: str

@router.post("/research")
async def directive_research(
    request: ResearchRequest,
    background_tasks: BackgroundTasks
):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Empty query")

    directive_id = DirectiveEngine.create_directive(query)
    background_tasks.add_task(DirectiveEngine.execute_research, directive_id)

    return {
        "status": "searching",
        "directive_id": directive_id,
        "query": query
    }

@router.get("/stream/{directive_id}")
async def stream_directive(directive_id: str):
    if directive_id not in ACTIVE_DIRECTIVES:
        raise HTTPException(status_code=404, detail="Directive not found")

    async def event_generator():
        queue = DIRECTIVE_QUEUES.get(directive_id)
        if not queue:
            d = ACTIVE_DIRECTIVES[directive_id]
            payload = {
                "event": "research_completed" if d["status"] == "completed" else "research_failed",
                "timestamp": d.get("created_at"),
                "data": {
                    "results": d["results"],
                    "total": len(d["results"])
                }
            }
            yield f"data: {json.dumps(payload)}\n\n"
            return

        while True:
            try:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
                queue.task_done()
                if event["event"] in ["research_completed", "research_failed"]:
                    break
            except asyncio.CancelledError:
                break
            except Exception as e:
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

@router.get("/status/{directive_id}")
async def get_directive_status(directive_id: str):
    if directive_id not in ACTIVE_DIRECTIVES:
        raise HTTPException(status_code=404, detail="Directive not found")
    return ACTIVE_DIRECTIVES[directive_id]
