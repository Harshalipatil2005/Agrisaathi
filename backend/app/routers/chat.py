from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx
import os
import json
from dotenv import load_dotenv
from fastapi import UploadFile, File

load_dotenv()

router = APIRouter(prefix="/chat", tags=["chat"])


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    language: Optional[str] = "en"


class TranslateRequest(BaseModel):
    text: str
    target_language: str


# ── Per-language system prompts ───────────────────────────────────────────────
SYSTEM_PROMPTS: dict[str, str] = {
    "en": (
        "You are KrishiBot, an expert agricultural assistant for Indian farmers. "
        "ONLY answer questions related to: farming, crops, soil health, irrigation, "
        "fertilizers, organic farming, pesticides, plant diseases, seeds, harvesting, "
        "livestock, dairy, poultry, weather impact on farming, government agricultural "
        "schemes, crop market prices, and post-harvest storage. "
        "If the user asks anything outside farming/agriculture, politely say: "
        "'I can only help with farming-related topics.' "
        "Be practical, use simple language, and give actionable advice. "
        "Do NOT use any markdown formatting. No stars, no hashtags, no backticks, no bullet symbols. "
        "Write in plain text only using normal sentences and line breaks. "
        "Respond in English."
    ),
    "hi": (
        "आप KrishiBot हैं, भारतीय किसानों के लिए एक विशेषज्ञ कृषि सहायक. "
        "केवल खेती, फसल, मिट्टी, सिंचाई, उर्वरक, जैविक खेती, कीटनाशक, "
        "पौधों के रोग, बीज, कटाई, पशुपालन, डेयरी, मुर्गीपालन, सरकारी कृषि योजनाएं, "
        "फसल बाजार भाव और भंडारण से जुड़े सवालों का जवाब दें. "
        "खेती से असंबंधित सवालों के लिए विनम्रता से कहें: "
        "'मैं केवल खेती से संबंधित विषयों में मदद कर सकता हूं.' "
        "व्यावहारिक सलाह दें. "
        "कोई भी markdown formatting उपयोग न करें. कोई स्टार, हैशटैग या बैकटिक नहीं. "
        "केवल सादे टेक्स्ट में उत्तर दें. हिंदी में उत्तर दें."
    ),
    "mr": (
        "आपण KrishiBot आहात, भारतीय शेतकऱ्यांसाठी एक तज्ञ कृषी सहाय्यक. "
        "फक्त शेती, पिके, माती, सिंचन, खते, सेंद्रिय शेती, कीटकनाशके, वनस्पती रोग, "
        "बियाणे, कापणी, पशुपालन, डेअरी, सरकारी कृषी योजना, पीक बाजारभाव "
        "या विषयांशी संबंधित प्रश्नांनाच उत्तर द्या. "
        "शेतीशी संबंधित नसलेल्या प्रश्नांसाठी सांगा: "
        "'मी फक्त शेतीशी संबंधित विषयांवर मदत करू शकतो.' "
        "व्यावहारिक सल्ला द्या. "
        "कोणतेही markdown formatting वापरू नका. स्टार, हॅशटॅग किंवा बॅकटिक नको. "
        "फक्त साध्या मजकुरात उत्तर द्या. मराठीत उत्तर द्या."
    ),
    "ta": (
        "நீங்கள் KrishiBot, இந்திய விவசாயிகளுக்கான நிபுணர் விவசாய உதவியாளர். "
        "விவசாயம், பயிர்கள், மண், நீர்ப்பாசனம், உரங்கள், பூச்சிகொல்லிகள், "
        "தாவர நோய்கள், அரசு திட்டங்கள் மற்றும் சந்தை விலைகள் தொடர்பான "
        "கேள்விகளுக்கு மட்டுமே பதிலளிக்கவும். "
        "விவசாயம் சம்பந்தமில்லாத கேள்விகளுக்கு: "
        "'என்னால் விவசாயம் தொடர்பான விஷயங்களில் மட்டுமே உதவ முடியும்.' என்று சொல்லவும். "
        "எந்த markdown formatting உபயோகிக்காதீர்கள். நட்சத்திரங்கள், ஹேஷ்டேக் வேண்டாம். "
        "தமிழில் பதில் கொடுங்கள்."
    ),
    "te": (
        "మీరు KrishiBot, భారతీయ రైతులకు నిపుణ వ్యవసాయ సహాయకుడు. "
        "వ్యవసాయం, పంటలు, నేల, నీటిపారుదల, ఎరువులు, పురుగుమందులు, "
        "మొక్కల వ్యాధులు, ప్రభుత్వ పథకాలు మరియు మార్కెట్ ధరలకు సంబంధించిన "
        "ప్రశ్నలకు మాత్రమే సమాధానం ఇవ్వండి. "
        "వ్యవసాయానికి సంబంధం లేని ప్రశ్నలకు: "
        "'నేను వ్యవసాయ అంశాలలో మాత్రమే సహాయం చేయగలను.' అని చెప్పండి. "
        "ఏ markdown formatting వాడవద్దు. నక్షత్రాలు, హ్యాష్‌ట్యాగ్‌లు వద్దు. "
        "తెలుగులో జవాబివ్వండి."
    ),
    "kn": (
        "ನೀವು KrishiBot, ಭಾರತೀಯ ರೈತರಿಗಾಗಿ ತಜ್ಞ ಕೃಷಿ ಸಹಾಯಕರು. "
        "ಕೃಷಿ, ಬೆಳೆಗಳು, ಮಣ್ಣು, ನೀರಾವರಿ, ಗೊಬ್ಬರ, ಕೀಟನಾಶಕಗಳು, "
        "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗಳಿಗೆ ಸಂಬಂಧಿಸಿದ "
        "ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ಉತ್ತರಿಸಿ. "
        "ಕೃಷಿಗೆ ಸಂಬಂಧಿಸದ ಪ್ರಶ್ನೆಗಳಿಗೆ: "
        "'ನಾನು ಕೃಷಿ ವಿಷಯಗಳಲ್ಲಿ ಮಾತ್ರ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.' ಎಂದು ಹೇಳಿ. "
        "ಯಾವುದೇ markdown formatting ಬಳಸಬೇಡಿ. ನಕ್ಷತ್ರಗಳು, ಹ್ಯಾಶ್‌ಟ್ಯಾಗ್‌ಗಳು ಬೇಡ. "
        "ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ."
    ),
    "gu": (
        "તમે KrishiBot છો, ભારતીય ખેડૂતો માટે નિષ્ણાત કૃષિ સહાયક. "
        "ખેતી, પાક, માટી, સિંચાઈ, ખાતર, જંતુનાશક, "
        "સરકારી યોજનાઓ અને બજાર ભાવ સંબંધિત પ્રશ્નોના જ જવાબ આપો. "
        "ખેતી સિવાયના પ્રશ્નો માટે: "
        "'હું ફક્ત ખેતી સંબંધિત વિષયોમાં મદદ કરી શકું છું.' એમ કહો. "
        "કોઈ markdown formatting વાપરો નહીં. સ્ટાર, હેશટેગ નહીં. "
        "ગુજરાતીમાં જવાબ આપો."
    ),
    "pa": (
        "ਤੁਸੀਂ KrishiBot ਹੋ, ਭਾਰਤੀ ਕਿਸਾਨਾਂ ਲਈ ਮਾਹਰ ਖੇਤੀਬਾੜੀ ਸਹਾਇਕ। "
        "ਖੇਤੀਬਾੜੀ, ਫ਼ਸਲਾਂ, ਮਿੱਟੀ, ਸਿੰਚਾਈ, ਖਾਦ, ਕੀਟਨਾਸ਼ਕ, "
        "ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ ਅਤੇ ਮੰਡੀ ਭਾਅ ਸੰਬੰਧੀ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦਿਓ। "
        "ਖੇਤੀ ਤੋਂ ਬਾਹਰ ਦੇ ਸਵਾਲਾਂ ਲਈ: "
        "'ਮੈਂ ਸਿਰਫ਼ ਖੇਤੀ ਨਾਲ ਜੁੜੇ ਵਿਸ਼ਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ।' ਕਹੋ। "
        "ਕੋਈ markdown formatting ਨਾ ਵਰਤੋ। ਤਾਰੇ, ਹੈਸ਼ਟੈਗ ਨਹੀਂ। "
        "ਪੰਜਾਬੀ ਵਿੱਚ ਜਵਾਬ ਦਿਓ।"
    ),
}

WHISPER_LANG_MAP: dict[str, str] = {
    "en": "en", "hi": "hi", "mr": "mr",
    "ta": "ta", "te": "te", "kn": "kn",
    "gu": "gu", "pa": "pa",
}


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = "en",
):
    """Speech to text using Groq Whisper"""
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    audio_data   = await file.read()
    whisper_lang = WHISPER_LANG_MAP.get(language, "en")

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {groq_key}"},
            files={
                "file": (
                    file.filename or "audio.webm",
                    audio_data,
                    file.content_type or "audio/webm",
                )
            },
            data={
                "model": "whisper-large-v3",
                "response_format": "json",
                "language": whisper_lang,
            },
            timeout=30.0,
        )
        data = res.json()
        print("WHISPER RESPONSE:", data)
        if "text" not in data:
            raise HTTPException(status_code=500, detail=f"Transcription failed: {data}")
        return {"text": data["text"]}


@router.post("/")
async def chat(body: ChatRequest):
    """KrishiBot multilingual farming assistant — streaming, no auth"""
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="Groq API key not configured")

    lang          = body.language if body.language in SYSTEM_PROMPTS else "en"
    system_prompt = SYSTEM_PROMPTS[lang]

    async def generate():
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        *[{"role": m.role, "content": m.content} for m in body.messages],
                    ],
                    "max_tokens": 600,
                    "temperature": 0.7,
                    "stream": True,
                },
                timeout=30.0,
            ) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        try:
                            chunk = json.loads(data)
                            token = chunk["choices"][0]["delta"].get("content", "")
                            if token:
                                yield f"data: {json.dumps({'token': token})}\n\n"
                        except Exception:
                            pass

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/translate-text")
async def translate_text(body: TranslateRequest):
    if body.target_language == "en":
        return {"translated": body.text}

    groq_key   = os.getenv("GROQ_API_KEY")
    lang_names = {
        "hi": "Hindi", "mr": "Marathi", "en": "English",
        "ta": "Tamil",  "te": "Telugu",  "kn": "Kannada",
        "gu": "Gujarati", "pa": "Punjabi",
    }
    lang = lang_names.get(body.target_language, body.target_language)

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            f"Translate this UI text to {lang}. "
                            "Return ONLY the translated text. No quotes, no explanation. "
                            "Keep it short and natural for a mobile app."
                        ),
                    },
                    {"role": "user", "content": body.text},
                ],
                "max_tokens": 100,
                "temperature": 0.1,
            },
            timeout=10.0,
        )
        data       = res.json()
        translated = data["choices"][0]["message"]["content"].strip()
        return {"translated": translated}