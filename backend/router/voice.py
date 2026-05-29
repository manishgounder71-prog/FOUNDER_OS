from fastapi import APIRouter, HTTPException, BackgroundTasks, Header, Query, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from backend.config import settings
from backend.workflows.engine import WorkflowEngine
from backend.database import save_memory
from datetime import datetime
import google.generativeai as genai

router = APIRouter(prefix="/api/voice", tags=["voice"])

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Transcribes an uploaded audio file securely on the server side using the Gemini API key."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="Gemini API Key is not configured on the server. Please add it to your .env file."
        )
    
    try:
        audio_bytes = await file.read()
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="Audio file too short or empty.")
            
        mime_type = file.content_type or "audio/webm"
        mime_type = mime_type.split(";")[0]

        print(f"[Backend Transcribe] Received audio file: {file.filename}, type: {mime_type}, size: {len(audio_bytes)} bytes")
        
        # Configure model fallback list
        models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        last_error = None
        
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name=model_name)
                response = model.generate_content([
                    {
                        "mime_type": mime_type,
                        "data": audio_bytes
                    },
                    "Transcribe this audio exactly. Return ONLY the spoken words."
                ])
                text = response.text.strip() if response and response.text else ""
                print(f"[Backend Transcribe] Transcription succeeded with model '{model_name}': '{text}'")
                return {"text": text}
            except Exception as e:
                print(f"[Backend Transcribe] Model '{model_name}' failed: {e}")
                last_error = e
                
        if last_error:
            raise last_error
            
    except Exception as e:
        print(f"[Backend Transcribe] Error during transcription: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

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
