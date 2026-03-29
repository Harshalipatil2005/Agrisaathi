from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import json
from dotenv import load_dotenv
from app.middleware.auth import get_current_user
from fastapi import UploadFile, File
import base64

load_dotenv()

router = APIRouter(prefix="/chat", tags=["chat"])

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    language: Optional[str] = "English"

class TranslateRequest(BaseModel):
    text: str
    target_language: str


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    """Speech to text using Groq Whisper"""
    groq_key = os.getenv('GROQ_API_KEY')
    if not groq_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    audio_data = await file.read()

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {groq_key}"},
            files={"file": (file.filename or "audio.webm", audio_data, file.content_type or "audio/webm")},
            data={"model": "whisper-large-v3", "response_format": "json"},
            timeout=30.0
        )
        data = res.json()
        print("WHISPER RESPONSE:", data)
        if "text" not in data:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {data}")
        return {"text": data["text"]}
@router.post("/")
async def chat(body: ChatRequest, user=Depends(get_current_user)):
    groq_key = os.getenv('GROQ_API_KEY')
    if not groq_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    async def generate():
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {
                            "role": "system",
                            "content": f"""You are EcoBot, a sustainability assistant.
Help with recycling, carbon footprint, sustainability, and environmental issues.
Always respond in {body.language}. Keep responses concise."""
                        },
                        *[{"role": m.role, "content": m.content} for m in body.messages]
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7,
                    "stream": True
                },
                timeout=30.0
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            yield f"data: [DONE]\n\n"
                            break
                        try:
                            chunk = json.loads(data)
                            token = chunk["choices"][0]["delta"].get("content", "")
                            if token:
                                yield f"data: {json.dumps({'token': token})}\n\n"
                        except:
                            pass

    return StreamingResponse(generate(), media_type="text/event-stream")

@router.post("/translate-text")
async def translate_text(body: TranslateRequest):
    if body.target_language == "en":
        return {"translated": body.text}
    

    groq_key = os.getenv('GROQ_API_KEY')
    lang_names = {"hi": "Hindi", "mr": "Marathi", "en": "English"}
    lang = lang_names.get(body.target_language, body.target_language)

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": f"Translate this UI text to {lang}. Return ONLY the translated text. No quotes, no explanation. Keep it short and natural for a mobile app."
                    },
                    {"role": "user", "content": body.text}
                ],
                "max_tokens": 100,
                "temperature": 0.1
            },
            timeout=10.0
        )
        data = res.json()
        translated = data["choices"][0]["message"]["content"].strip()
        return {"translated": translated}