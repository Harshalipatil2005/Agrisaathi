"""
KrishiMitra Agricultural Advisor API — Gemini Free Tier
========================================================
Endpoints:
  POST /chat/               — Streaming multilingual chat (agri/weather only)
  POST /chat/transcribe     — Multilingual speech-to-text (voice input)
  POST /chat/tts            — Multilingual text-to-speech (returns MP3 bytes)
  POST /chat/translate-text — UI string translation
  GET  /chat/languages      — List of supported languages

FIXES vs previous version:
  - Transcription: webm audio is converted-to-compatible before sending to Gemini.
    Gemini inline audio only supports: audio/wav, audio/mp3, audio/ogg, audio/flac, audio/aiff.
    We send the raw bytes with audio/ogg which browsers also produce, OR fall back to
    a prompt-based Gemini call with the correct MIME. For webm we re-label as audio/ogg
    since webm/opus and ogg/opus are near-identical containers and Gemini accepts it.
  - All HTTPException are raised correctly (no bare ValueError).
  - Streaming SSE properly terminates with [DONE].
  - TTS returns raw MP3 bytes for frontend <audio> playback.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import json
import base64
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/chat", tags=["chat"])

# ── Gemini free-tier config ────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_BASE  = "https://generativelanguage.googleapis.com/v1beta/models"

# Supported UI languages (code → full display name)
SUPPORTED_LANGUAGES: dict[str, str] = {
    "en": "English",
    "hi": "Hindi",
    "mr": "Marathi",
    "pa": "Punjabi",
    "gu": "Gujarati",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "bn": "Bengali",
    "or": "Odia",
    "ml": "Malayalam",
    "ur": "Urdu",
}

# BCP-47 locale codes for Google Cloud TTS
TTS_LOCALE: dict[str, str] = {
    "en": "en-IN", "hi": "hi-IN", "mr": "mr-IN",
    "pa": "pa-IN", "gu": "gu-IN", "ta": "ta-IN",
    "te": "te-IN", "kn": "kn-IN", "bn": "bn-IN",
    "or": "or-IN", "ml": "ml-IN", "ur": "ur-IN",
}

# Google Cloud TTS voice names per locale
TTS_VOICE: dict[str, str] = {
    "en-IN": "en-IN-Standard-D",
    "hi-IN": "hi-IN-Standard-A",
    "mr-IN": "mr-IN-Standard-A",
    "pa-IN": "pa-IN-Standard-A",
    "gu-IN": "gu-IN-Standard-A",
    "ta-IN": "ta-IN-Standard-A",
    "te-IN": "te-IN-Standard-A",
    "kn-IN": "kn-IN-Standard-A",
    "bn-IN": "bn-IN-Standard-A",
    "ml-IN": "ml-IN-Standard-A",
    "ur-IN": "ur-IN-Standard-A",
}

# Gemini supports these audio MIME types for inline audio only.
# audio/webm is NOT supported — we remap it to audio/ogg (same codec, compatible container).
GEMINI_SAFE_MIME: dict[str, str] = {
    "audio/webm":            "audio/ogg",
    "audio/webm;codecs=opus":"audio/ogg",
    "audio/ogg":             "audio/ogg",
    "audio/wav":             "audio/wav",
    "audio/x-wav":           "audio/wav",
    "audio/mp3":             "audio/mp3",
    "audio/mpeg":            "audio/mp3",
    "audio/flac":            "audio/flac",
    "audio/x-flac":          "audio/flac",
    "audio/aiff":            "audio/aiff",
    "audio/x-aiff":          "audio/aiff",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def get_gemini_key() -> str:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured in .env")
    return key


def resolve_language(lang_input: Optional[str]) -> str:
    """Accept a language code ('hi') or full name ('Hindi'). Returns full name."""
    if not lang_input or not lang_input.strip():
        return "English"
    s = lang_input.strip()
    return SUPPORTED_LANGUAGES.get(s, s)


def resolve_lang_code(lang_input: Optional[str]) -> str:
    """Return BCP-47 locale string for TTS. Defaults to en-IN."""
    if not lang_input:
        return "en-IN"
    s = lang_input.strip().lower()
    if s in TTS_LOCALE:
        return TTS_LOCALE[s]
    for code, name in SUPPORTED_LANGUAGES.items():
        if name.lower() == s:
            return TTS_LOCALE[code]
    return "en-IN"


def safe_mime(content_type: Optional[str]) -> str:
    """Remap browser MIME types to ones Gemini actually accepts."""
    if not content_type:
        return "audio/ogg"
    # Strip parameters like ';codecs=opus'
    base = content_type.split(";")[0].strip().lower()
    full = content_type.strip().lower()
    return GEMINI_SAFE_MIME.get(full) or GEMINI_SAFE_MIME.get(base) or "audio/ogg"


# ── System Prompt ──────────────────────────────────────────────────────────────

def build_system_prompt(lang: str) -> str:
    return f"""You are KrishiMitra — a warm, expert Agricultural Advisor chatbot built for Indian farmers.

ALLOWED TOPICS (answer ONLY these):
  1. Farming & agriculture — crops, seeds, soil health, fertilizers, pesticides, irrigation, harvesting, storage
  2. Weather & climate — forecasts, seasonal patterns, monsoon, drought/flood impact on crops
  3. Agri-market prices — mandi rates, MSP (Minimum Support Price), selling tips
  4. Government schemes & subsidies — PM-KISAN, Pradhan Mantri Fasal Bima Yojana, Soil Health Card, e-NAM, KCC, etc.
  5. Livestock & poultry — directly related to farm income
  6. Sustainable & organic farming
  7. Farm equipment, tools, and machinery

STRICT OFF-TOPIC REFUSAL RULE:
If the user asks about ANYTHING outside the above list — politics, movies, sports, coding, general science,
medical advice, relationship advice, finance unrelated to farming, etc. — you MUST refuse politely in {lang}
and redirect them. Use this refusal template (translated naturally into {lang}):
  "नमस्ते! मैं KrishiMitra हूँ — आपका कृषि सहायक। मैं केवल खेती, मौसम, सरकारी योजनाओं और
   फसल से जुड़े सवालों का जवाब दे सकता हूँ। कृपया मुझसे खेती के बारे में पूछें!"
(Translate the above refusal into {lang} naturally, do not use Hindi if {lang} is not Hindi.)

LANGUAGE RULES:
  • ALWAYS reply in {lang} only — even if the user writes in a different language.
  • Use simple words suitable for rural farmers with basic literacy.
  • Use local/regional crop names, seasons (Kharif/Rabi/Zaid), and state-specific advice where helpful.

RESPONSE STYLE:
  • Be warm, encouraging, and supportive — like a trusted village elder or krishi sevak.
  • Short questions → 2–4 sentence answers.
  • Complex questions → use 3–5 short bullet points.
  • Always be practical and actionable for small/medium Indian farms.
  • Never give dangerous chemical dosages without safety warnings.
"""


# ── Pydantic Models ────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str       # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    language: Optional[str] = "English"    # code ("hi") or full name ("Hindi")


class TranslateRequest(BaseModel):
    text: str
    target_language: str                   # language code e.g. "hi"


class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "en"         # language code or full name


# ── 1. GET /languages ──────────────────────────────────────────────────────────

@router.get("/languages")
async def list_languages():
    """Returns all supported languages for frontend dropdowns."""
    return {
        "languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ]
    }


# ── 2. POST /transcribe ────────────────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Query(default=None),   # e.g. ?language=hi
):
    """
    Multilingual speech-to-text via Gemini.

    BUG FIX: browsers record audio/webm which Gemini DOES NOT support as inline audio.
    We remap it to audio/ogg (same Opus codec, compatible container) before sending.
    Supported by Gemini: audio/wav, audio/mp3, audio/ogg, audio/flac, audio/aiff.
    """
    key = get_gemini_key()

    audio_data = await file.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Received empty audio file")

    audio_b64 = base64.b64encode(audio_data).decode("utf-8")
    mime       = safe_mime(file.content_type)   # remap webm → ogg etc.

    lang_hint = ""
    if language:
        resolved  = resolve_language(language)
        lang_hint = f" The speaker is speaking in {resolved}."

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime,
                            "data": audio_b64,
                        }
                    },
                    {
                        "text": (
                            f"Transcribe this audio accurately.{lang_hint} "
                            "Return ONLY the transcribed text, exactly as spoken. "
                            "Do NOT translate. Do NOT add any explanation or punctuation beyond what was said."
                        )
                    },
                ]
            }
        ],
        "generationConfig": {"temperature": 0.0},
    }

    url = f"{GEMINI_BASE}/{GEMINI_MODEL}:generateContent?key={key}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(url, json=payload)

    if res.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini transcription failed ({res.status_code}): {res.text}",
        )

    data = res.json()

    # Check for safety blocks or empty candidates
    candidates = data.get("candidates", [])
    if not candidates:
        finish = data.get("promptFeedback", {}).get("blockReason", "unknown")
        raise HTTPException(status_code=422, detail=f"Gemini blocked the audio: {finish}")

    try:
        text = candidates[0]["content"]["parts"][0]["text"].strip()
        return {"text": text, "detected_mime": mime, "language_hint": language or "auto"}
    except (KeyError, IndexError) as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected Gemini response structure: {data}")


# ── 3. POST / (chat) ───────────────────────────────────────────────────────────

@router.post("/")
async def chat(body: ChatRequest):
    """
    Streaming agri-only chat in the user's language.
    Rejects off-topic questions with a polite redirect.
    """
    key  = get_gemini_key()
    lang = resolve_language(body.language)

    # Gemini requires conversation to start with a "user" turn.
    # Filter out any leading assistant messages just in case.
    contents: list[dict] = []
    for m in body.messages:
        role = "model" if m.role == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m.content}]})

    # Gemini requires alternating user/model turns — deduplicate consecutive same-role
    deduped: list[dict] = []
    for turn in contents:
        if deduped and deduped[-1]["role"] == turn["role"]:
            # Merge consecutive same-role messages
            deduped[-1]["parts"][0]["text"] += "\n" + turn["parts"][0]["text"]
        else:
            deduped.append(turn)

    if not deduped or deduped[0]["role"] != "user":
        raise HTTPException(status_code=400, detail="Conversation must start with a user message")

    payload = {
        "system_instruction": {"parts": [{"text": build_system_prompt(lang)}]},
        "contents": deduped,
        "generationConfig": {
            "maxOutputTokens": 1000,
            "temperature": 0.7,
        },
    }

    url = f"{GEMINI_BASE}/{GEMINI_MODEL}:streamGenerateContent?alt=sse&key={key}"

    async def generate():
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        err = await response.aread()
                        yield f"data: {json.dumps({'error': err.decode()})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[6:].strip()
                        if not raw:
                            continue
                        try:
                            chunk  = json.loads(raw)
                            parts  = (
                                chunk.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [])
                            )
                            for part in parts:
                                token = part.get("text", "")
                                if token:
                                    yield f"data: {json.dumps({'token': token})}\n\n"
                        except (json.JSONDecodeError, KeyError, IndexError):
                            pass
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ── 4. POST /tts ───────────────────────────────────────────────────────────────

@router.post("/tts")
async def text_to_speech(body: TTSRequest):
    """
    Multilingual Text-to-Speech via Google Cloud TTS.
    Returns raw MP3 bytes (audio/mpeg) — play directly with an <audio> element
    or the Web Audio API on the frontend.

    Free tier: 1,000,000 characters / month.
    Key: GOOGLE_TTS_API_KEY in .env (or falls back to GEMINI_API_KEY if TTS is
    enabled on the same Google Cloud project).

    Enable at: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
    """
    tts_key = os.getenv("GOOGLE_TTS_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not tts_key:
        raise HTTPException(status_code=501, detail="No TTS API key configured (set GOOGLE_TTS_API_KEY)")

    locale     = resolve_lang_code(body.language)
    voice_name = TTS_VOICE.get(locale, "en-IN-Standard-D")

    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text field is empty")

    # Remove markdown symbols that sound bad when spoken
    import re
    clean_text = re.sub(r"[*#_`~•]", "", text).strip()

    payload = {
        "input": {"text": clean_text},
        "voice": {
            "languageCode": locale,
            "name": voice_name,
            "ssmlGender": "FEMALE",
        },
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": 0.88,   # slightly slower for rural clarity
            "pitch": 0.0,
        },
    }

    url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={tts_key}"

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data      = res.json()
            audio_b64 = data.get("audioContent", "")
            if not audio_b64:
                raise HTTPException(status_code=500, detail="Google TTS returned empty audioContent")
            audio_bytes = base64.b64decode(audio_b64)
            return Response(
                content=audio_bytes,
                media_type="audio/mpeg",
                headers={"Content-Disposition": "inline; filename=reply.mp3"},
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Google TTS error {exc.response.status_code}: {exc.response.text}",
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"TTS failed: {str(exc)}")


# ── 5. POST /translate-text ────────────────────────────────────────────────────

@router.post("/translate-text")
async def translate_text(body: TranslateRequest):
    """Translate short UI strings to any supported language using Gemini."""
    if body.target_language == "en":
        return {"translated": body.text, "language": "English"}

    key  = get_gemini_key()
    lang = SUPPORTED_LANGUAGES.get(body.target_language, body.target_language)

    payload = {
        "contents": [
            {"parts": [{"text": body.text}]}
        ],
        "system_instruction": {
            "parts": [
                {
                    "text": (
                        f"You are a translator. Translate the following UI text to {lang}. "
                        "Return ONLY the translated text. "
                        "No quotes, no explanation, no punctuation changes. "
                        "Keep it short and natural for a mobile farming app."
                    )
                }
            ]
        },
        "generationConfig": {
            "maxOutputTokens": 200,
            "temperature": 0.1,
        },
    }

    url = f"{GEMINI_BASE}/{GEMINI_MODEL}:generateContent?key={key}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data = res.json()
            translated = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            return {"translated": translated, "language": lang}

        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Gemini API error {exc.response.status_code}: {exc.response.text}",
            )
        except (KeyError, IndexError):
            raise HTTPException(status_code=500, detail=f"Unexpected Gemini response: {data}")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Translation failed: {str(exc)}")