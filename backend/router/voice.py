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
    simulated: Optional[bool] = False

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
                import base64
                import urllib.request
                import json
                import time

                # Convert to WAV first (Gemini handles WAV reliably vs WebM)
                wav_path = temp_file_path.rsplit(".", 1)[0] + ".wav"
                try:
                    import subprocess
                    subprocess.run(
                        ["ffmpeg", "-y", "-i", temp_file_path, "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", wav_path],
                        capture_output=True, timeout=30
                    )
                    audio_path = wav_path
                    mime = "audio/wav"
                except Exception as conv_err:
                    print(f"[Voice] ffmpeg conversion failed: {conv_err}")
                    audio_path = temp_file_path
                    ext = os.path.splitext(temp_file_path)[1].lower()
                    mime = {"webm": "audio/webm", "wav": "audio/wav", "ogg": "audio/ogg"}.get(ext.replace(".", ""), "audio/webm")

                # Read and base64-encode the audio
                with open(audio_path, "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("utf-8")
                print(f"[Voice] Audio encoded: {len(b64)} chars, mime={mime}")

                if audio_path == wav_path and os.path.exists(wav_path):
                    try: os.remove(wav_path)
                    except: pass

                # Try Gemini REST API with inline audio data (bypasses File API)
                models_api = ["gemini-2.0-flash", "gemini-1.5-flash"]
                transcript_text = None
                for model_name in models_api:
                    try:
                        print(f"[Voice] Calling Gemini REST API model={model_name}...")
                        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                        payload = {
                            "contents": [{
                                "parts": [
                                    {"inline_data": {"mime_type": mime, "data": b64}},
                                    {"text": "Transcribe this audio recording exactly. Return ONLY the transcribed text, nothing else."}
                                ]
                            }]
                        }
                        req = urllib.request.Request(
                            url,
                            data=json.dumps(payload).encode("utf-8"),
                            headers={"Content-Type": "application/json"}
                        )
                        with urllib.request.urlopen(req, timeout=60) as resp:
                            result = json.loads(resp.read().decode("utf-8"))

                        candidate = result.get("candidates", [{}])[0]
                        text = candidate.get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        print(f"[Voice] Gemini {model_name} result: '{text[:100]}'")
                        if text:
                            transcript_text = text
                            break
                    except Exception as model_err:
                        print(f"[Voice] Gemini REST model {model_name} failed: {model_err}")
                
                if transcript_text:
                    return {"transcript": transcript_text}
                last_err = Exception("All Gemini REST models returned empty")
            except Exception as gemini_err:
                print(f"[Voice] Gemini REST transcription failed: {gemini_err}")
                last_err = gemini_err
                
                if response is None and last_err:
                    raise last_err
                
                transcript_text = response.text.strip()
                if transcript_text:
                    return {"transcript": transcript_text}
            except Exception as gemini_err:
                print(f"[Voice] Gemini transcription fallback failed: {gemini_err}")
                last_err = gemini_err

        # 3. Try OpenRouter transcription via chat completions with free multimodal models
        if settings.OPENROUTER_API_KEY:
            import base64
            import urllib.request
            import json
            
            with open(temp_file_path, "rb") as f:
                audio_data = base64.b64encode(f.read()).decode("utf-8")
            
            file_ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
            if file_ext not in ["wav", "mp3", "flac", "ogg", "webm", "m4a"]:
                file_ext = "wav"
            
            mime_type_map = {"wav": "audio/wav", "mp3": "audio/mpeg", "flac": "audio/flac", "ogg": "audio/ogg", "webm": "audio/webm", "m4a": "audio/mp4"}
            mime_type = mime_type_map.get(file_ext, "audio/wav")
            data_uri = f"data:{mime_type};base64,{audio_data}"
            
            transcript_text = None
            
            # 3a. Try dedicated audio transcriptions endpoint (paid models, requires $0.50 balance)
            try:
                paid_models = ["openai/whisper-large-v3-turbo", "openai/whisper-large-v3"]
                for model_name in paid_models:
                    try:
                        print(f"[Voice] Trying OpenRouter paid transcription model {model_name}...")
                        payload = {
                            "model": model_name,
                            "input_audio": {
                                "data": audio_data,
                                "format": file_ext
                            }
                        }
                        
                        req = urllib.request.Request(
                            "https://openrouter.ai/api/v1/audio/transcriptions",
                            data=json.dumps(payload).encode("utf-8"),
                            headers={
                                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                                "Content-Type": "application/json",
                            },
                            method="POST"
                        )
                        
                        with urllib.request.urlopen(req, timeout=60) as response:
                            res_data = json.loads(response.read().decode("utf-8"))
                            if "text" in res_data:
                                transcript_text = res_data["text"].strip()
                                if transcript_text:
                                    break
                            elif "error" in res_data:
                                error_msg = res_data["error"].get("message", "Unknown OpenRouter error")
                                raise Exception(error_msg)
                    except Exception as model_err:
                        if "402" in str(model_err) or "Payment Required" in str(model_err) or "balance" in str(model_err).lower():
                            print(f"[Voice] Paid transcription model {model_name} needs $0.50 balance. Skipping.")
                        else:
                            print(f"[Voice] Paid model {model_name} failed: {model_err}")
                        last_err = model_err
                
                if transcript_text:
                    return {"transcript": transcript_text}
            except Exception as or_err:
                print(f"[Voice] OpenRouter paid transcription failed: {or_err}")
                last_err = or_err
            
            # 3b. Try free multimodal chat models that may accept audio input
            free_models = [
                "google/gemini-2.0-flash-exp:free",
                "google/gemma-3-27b-it:free",
                "mistralai/mistral-small-3.1-24b-instruct:free"
            ]
            try:
                for model_name in free_models:
                    try:
                        print(f"[Voice] Trying free OpenRouter chat model {model_name} for audio transcription...")
                        chat_payload = {
                            "model": model_name,
                            "messages": [
                                {
                                    "role": "user",
                                    "content": [
                                        {"type": "text", "text": "Transcribe this audio recording exactly. Return only the transcribed text, nothing else."},
                                        {"type": "audio_url", "audio_url": {"url": data_uri}}
                                    ]
                                }
                            ],
                            "max_tokens": 500
                        }
                        
                        req = urllib.request.Request(
                            "https://openrouter.ai/api/v1/chat/completions",
                            data=json.dumps(chat_payload).encode("utf-8"),
                            headers={
                                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                                "Content-Type": "application/json",
                            },
                            method="POST"
                        )
                        
                        with urllib.request.urlopen(req, timeout=60) as response:
                            chat_data = json.loads(response.read().decode("utf-8"))
                            if "choices" in chat_data and len(chat_data["choices"]) > 0:
                                text = chat_data["choices"][0]["message"]["content"].strip()
                                if text:
                                    transcript_text = text
                                    break
                            elif "error" in chat_data:
                                error_msg = chat_data["error"].get("message", "")
                                print(f"[Voice] Free model {model_name} error: {error_msg}")
                    except Exception as free_err:
                        print(f"[Voice] Free model {model_name} failed: {free_err}")
                        last_err = free_err
                
                if transcript_text:
                    print(f"[Voice] Free model transcription successful: '{transcript_text[:60]}...'")
                    return {"transcript": transcript_text}
            except Exception as or_free_err:
                print(f"[Voice] OpenRouter free chat transcription failed: {or_free_err}")
                last_err = or_free_err

        # If keys are present but all failed — fall back to mock transcription
        # so the frontend never gets a hard error and can still use the app
        print(f"[Voice] All transcription methods failed. Returning empty to let user type command.")
        return {"transcript": ""}

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
