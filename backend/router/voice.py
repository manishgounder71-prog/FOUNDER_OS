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
    if mock_prompt:
        return {"transcript": mock_prompt}

    temp_file_path = None
    try:
        temp_dir = "./temp_audio"
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, file.filename)

        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        file_size = os.path.getsize(temp_file_path)
        print(f"[Voice] Received audio: {file_size} bytes, type={file.content_type}")

        if file_size < 200:
            return {"transcript": ""}

        # Convert to WAV for better compatibility
        wav_path = temp_file_path.rsplit(".", 1)[0] + ".wav"
        import subprocess, base64, urllib.request, json
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", temp_file_path, "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", wav_path],
                capture_output=True, timeout=30
            )
            audio_path = wav_path
            mime = "audio/wav"
        except Exception as conv_err:
            print(f"[Voice] ffmpeg failed: {conv_err}")
            audio_path = temp_file_path
            ext = os.path.splitext(temp_file_path)[1].lower()
            mime = {"webm": "audio/webm", "wav": "audio/wav", "ogg": "audio/ogg"}.get(ext.replace(".", ""), "audio/webm")

        with open(audio_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        print(f"[Voice] Audio encoded: {len(b64)} chars, mime={mime}")

        if audio_path == wav_path and os.path.exists(wav_path):
            try: os.remove(wav_path)
            except: pass

        # Try Gemini REST API with inline audio
        if settings.GEMINI_API_KEY:
            models_api = ["gemini-2.0-flash", "gemini-1.5-flash"]
            for model_name in models_api:
                try:
                    print(f"[Voice] Trying Gemini {model_name}...")
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                    payload = {
                        "contents": [{
                            "parts": [
                                {"inline_data": {"mime_type": mime, "data": b64}},
                                {"text": "Transcribe this audio exactly. Return ONLY the transcribed words."}
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
                    finish = candidate.get("finishReason", "")
                    print(f"[Voice] Gemini {model_name}: text='{text[:80]}' finish={finish}")
                    if text:
                        return {"transcript": text}
                    if finish == "SAFETY":
                        return {"transcript": "[Blocked by safety filters. Try different wording.]"}
                except urllib.error.HTTPError as he:
                    body = he.read().decode("utf-8")
                    print(f"[Voice] Gemini HTTP {he.code}: {body[:200]}")
                    if "API_KEY_INVALID" in body:
                        return {"transcript": f"[ERROR: Gemini API key is invalid. Check your Render env var GEMINI_API_KEY.]"}
                    if "API_KEY" in body or "403" in str(he.code):
                        return {"transcript": f"[ERROR: Gemini API key rejected (403). Check the key in Render dashboard.]"}
                    if "429" in str(he.code) or "RATE_LIMIT" in body:
                        return {"transcript": "[ERROR: Gemini rate limited. Try again in a minute.]"}
                except Exception as model_err:
                    print(f"[Voice] Gemini {model_name} error: {model_err}")

        # Try OpenRouter free Gemini model
        if settings.OPENROUTER_API_KEY:
            try:
                print("[Voice] Trying OpenRouter gemini-2.0-flash-exp:free...")
                data_uri = f"data:{mime};base64,{b64}"
                chat_payload = {
                    "model": "google/gemini-2.0-flash-exp:free",
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Transcribe this audio exactly. Return ONLY the transcribed text, nothing else."},
                            {"type": "audio_url", "audio_url": {"url": data_uri}}
                        ]
                    }],
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
                with urllib.request.urlopen(req, timeout=60) as resp:
                    chat_data = json.loads(resp.read().decode("utf-8"))

                if "choices" in chat_data and len(chat_data["choices"]) > 0:
                    text = chat_data["choices"][0]["message"]["content"].strip()
                    if text:
                        print(f"[Voice] OpenRouter result: '{text[:80]}'")
                        return {"transcript": text}
                elif "error" in chat_data:
                    err_msg = chat_data["error"].get("message", "")
                    print(f"[Voice] OpenRouter error: {err_msg}")
                    if "402" in err_msg or "credits" in err_msg or "balance" in err_msg:
                        return {"transcript": f"[ERROR: OpenRouter needs credits. Add funds to your OpenRouter account.]"}
                    return {"transcript": f"[ERROR: {err_msg[:100]}]"}
            except urllib.error.HTTPError as he:
                body = he.read().decode("utf-8")
                print(f"[Voice] OpenRouter HTTP {he.code}: {body[:200]}")
                if "402" in str(he.code):
                    return {"transcript": "[ERROR: OpenRouter needs minimum $0.50 balance for audio.]"}
                return {"transcript": f"[ERROR: OpenRouter HTTP {he.code}]"}
            except Exception as or_err:
                print(f"[Voice] OpenRouter error: {or_err}")

        print("[Voice] All transcription methods failed.")
        return {"transcript": ""}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[Voice] Critical error: {e}")
        return {"transcript": f"[ERROR: {str(e)[:80]}]"}
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try: os.remove(temp_file_path)
            except: pass

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
