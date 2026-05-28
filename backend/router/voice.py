from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Query, Request
from pydantic import BaseModel
from typing import Optional
from backend.config import settings
from backend.workflows.engine import WorkflowEngine
from backend.database import save_memory
from datetime import datetime

router = APIRouter(prefix="/api/voice", tags=["voice"])

class OmiWebhookPayload(BaseModel):
    transcript: str
    session_id: Optional[str] = None
    speaker: Optional[str] = "founder"
    simulated: Optional[bool] = False

@router.post("/omi-webhook")
async def omi_webhook(
    payload: OmiWebhookPayload,
    background_tasks: BackgroundTasks,
    request: Request,
    x_omi_api_key: Optional[str] = Header(None, alias="X-Omi-API-Key"),
    api_key: Optional[str] = Query(None)
):
    """Omi wearable webhook endpoint. Receives transcriptions pushed by the Omi app,
    initiates a background agent workflow, and saves the conversation.
    """
    # Skip auth for simulated requests from the frontend's Omi Webhook Simulator
    if not payload.simulated and settings.OMI_API_KEY:
        # If it is a local request originating from localhost/127.0.0.1, bypass key verification
        referer = request.headers.get("referer", "")
        origin = request.headers.get("origin", "")
        client_host = request.client.host if request.client else ""
        is_local = (
            "localhost" in referer or 
            "127.0.0.1" in referer or 
            "localhost" in origin or 
            "127.0.0.1" in origin or
            client_host in ("127.0.0.1", "localhost", "::1")
        )
        print(f"[Debug Webhook] referer='{referer}', origin='{origin}', client_host='{client_host}', is_local={is_local}")
        
        if not is_local:
            provided_key = api_key or x_omi_api_key
            if not provided_key or provided_key != settings.OMI_API_KEY:
                print("[Omi Webhook] Unauthorized access attempt: missing or mismatching API key.")
                raise HTTPException(
                    status_code=401,
                    detail="Unauthorized: Invalid Omi API key. Secure your webhook using api_key query param or X-Omi-API-Key header."
                )
    transcript = payload.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Empty transcript")

    print(f"[Omi Webhook] Received transcription: '{transcript}'")

    # Save the Omi transcript inside the conversations collection in Qdrant
    try:
        save_memory(
            collection="conversations",
            text=f"Omi Wearable Push: {transcript}",
            metadata={
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "source": "Omi Wearable Device",
                "session_id": payload.session_id,
                "type": "Omi Voice Intake"
            }
        )
    except Exception as e:
        print(f"[Omi Webhook] Error indexing conversations: {e}")

    # Start the workflow autonomous execution in background
    workflow_id = WorkflowEngine.create_workflow(transcript)
    background_tasks.add_task(WorkflowEngine.execute_workflow, workflow_id)

    return {
        "status": "triggered",
        "message": "Workflow started from Omi voice command.",
        "workflow_id": workflow_id,
        "transcript": transcript
    }
