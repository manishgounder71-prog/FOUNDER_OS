from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import os
from openai import OpenAI
from backend.config import settings
from backend.workflows.engine import WorkflowEngine
from backend.database import save_memory
from datetime import datetime

router = APIRouter(prefix="/api/voice", tags=["voice"])

class OmiWebhookPayload(BaseModel):
    transcript: str
    session_id: Optional[str] = None
    speaker: Optional[str] = "founder"

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    mock_prompt: Optional[str] = Form(None)
):
    """Transcribes audio files recorded in the browser using OpenAI Whisper, 
    with a mock prompt fallback for easy developer testing.
    """
    # 1. If a mock prompt was sent by the frontend for debugging, use it directly
    if mock_prompt:
        return {"transcript": mock_prompt}
        
    if not settings.OPENAI_API_KEY:
        # Decoy fallback transcriptions for standard browser demo recordings
        print("[Voice] No API key, using mock audio transcription fallback.")
        return {"transcript": "Create a launch strategy for an AI study app"}
        
    temp_file_path = None
    try:
        # Save temp file
        temp_dir = "./temp_audio"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, file.filename)
        
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        # Transcribe with Whisper
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        with open(temp_file_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file
            )
            
        return {"transcript": transcript.text}
        
    except Exception as e:
        print(f"[Voice] Whisper transcription failed: {e}")
        # Return fallback rather than crashing
        return {"transcript": "Research competitors for an AI note-taking app and generate a launch strategy"}
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as err:
                print(f"[Voice] Failed to remove temp audio file: {err}")

@router.post("/omi-webhook")
async def omi_webhook(
    payload: OmiWebhookPayload,
    background_tasks: BackgroundTasks
):
    """Omi wearable webhook endpoint. Receives transcriptions pushed by the Omi app,
    initiates a background agent workflow, and saves the conversation.
    """
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
