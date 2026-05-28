from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Header, Query, Request
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
    """Transcribes audio files recorded in the browser using OpenAI Whisper.
    Returns a proper HTTP error if transcription is unavailable so the frontend
    can prompt the user to type their command instead of silently using wrong text.
    """
    # 1. If a mock prompt was sent by the frontend for debugging, use it directly
    if mock_prompt:
        return {"transcript": mock_prompt}

    temp_file_path = None
    try:
        # Save temp file
        temp_dir = "./temp_audio"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, file.filename)

        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        last_err = None
        # 1. Try OpenAI Whisper if API key is present
        if settings.OPENAI_API_KEY:
            try:
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                with open(temp_file_path, "rb") as audio_file:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file
                    )
                return {"transcript": transcript.text}
            except Exception as whisper_err:
                print(f"[Voice] Whisper transcription failed: {whisper_err}. Trying Gemini...")
                last_err = whisper_err

        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                print(f"[Voice] Uploading {temp_file_path} to Gemini for transcription...")
                audio_file = genai.upload_file(path=temp_file_path)
                
                # Loop through available models to ensure compatibility
                models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
                response = None
                for m_name in models_to_try:
                    try:
                        print(f"[Voice] Trying Gemini model {m_name}...")
                        model = genai.GenerativeModel(m_name)
                        response = model.generate_content([
                            audio_file,
                            "Please transcribe this audio recording exactly. Return only the transcription text, nothing else."
                        ])
                        break
                    except Exception as model_err:
                        print(f"[Voice] Gemini model {m_name} failed: {model_err}")
                        last_err = model_err
                
                try:
                    audio_file.delete()
                except Exception as delete_err:
                    print(f"[Voice] Failed to delete Gemini file: {delete_err}")
                
                if response is None and last_err:
                    raise last_err
                
                transcript_text = response.text.strip()
                if transcript_text:
                    return {"transcript": transcript_text}
            except Exception as gemini_err:
                print(f"[Voice] Gemini transcription fallback failed: {gemini_err}")
                last_err = gemini_err

        # 3. Try OpenRouter multimodal model transcription if OpenRouter API key is present
        if settings.OPENROUTER_API_KEY:
            try:
                import base64
                import urllib.request
                import json
                
                with open(temp_file_path, "rb") as f:
                    audio_data = base64.b64encode(f.read()).decode("utf-8")
                
                file_ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
                if file_ext not in ["wav", "mp3", "flac", "ogg", "webm", "m4a"]:
                    file_ext = "wav"
                
                models_to_try = ["nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "google/gemini-2.0-flash-lite-001", "google/gemini-2.0-flash-001"]
                transcript_text = None
                for model_name in models_to_try:
                    try:
                        print(f"[Voice] Trying OpenRouter model {model_name}...")
                        payload = {
                            "model": model_name,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "text",
                                            "text": "Transcribe this audio recording exactly. Do not add any introduction, explanations, or commentary. Output only the transcription."
                                        },
                                        {
                                            "type": "input_audio",
                                            "input_audio": {
                                                "data": audio_data,
                                                "format": file_ext
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                        
                        req = urllib.request.Request(
                            "https://openrouter.ai/api/v1/chat/completions",
                            data=json.dumps(payload).encode("utf-8"),
                            headers={
                                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                                "Content-Type": "application/json",
                            },
                            method="POST"
                        )
                        
                        with urllib.request.urlopen(req, timeout=60) as response:
                            res_data = json.loads(response.read().decode("utf-8"))
                            if "choices" in res_data and len(res_data["choices"]) > 0:
                                transcript_text = res_data["choices"][0]["message"]["content"].strip()
                                if transcript_text:
                                    break
                            elif "error" in res_data:
                                raise Exception(res_data["error"].get("message", "Unknown OpenRouter error"))
                    except Exception as model_err:
                        print(f"[Voice] OpenRouter model {model_name} failed: {model_err}")
                        last_err = model_err
                
                if transcript_text:
                    return {"transcript": transcript_text}
            except Exception as or_err:
                print(f"[Voice] OpenRouter transcription failed: {or_err}")
                last_err = or_err

        # If keys are present but all failed
        if (settings.OPENAI_API_KEY or settings.GEMINI_API_KEY or settings.OPENROUTER_API_KEY) and last_err:
            raise HTTPException(
                status_code=500,
                detail=f"Transcription failed: {str(last_err)}"
            )

        # If keys are missing entirely
        raise HTTPException(
            status_code=503,
            detail="Transcription service is not configured. Please set OPENAI_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY in the environment."
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[Voice] Audio transcription completely failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {str(e)}"
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception as err:
                print(f"[Voice] Failed to remove temp audio file: {err}")

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
    # Secure the endpoint if OMI_API_KEY is configured in backend environment
    if settings.OMI_API_KEY:
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
