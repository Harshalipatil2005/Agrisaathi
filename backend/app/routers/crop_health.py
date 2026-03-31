from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import base64
import json
from groq import Groq

load_dotenv()  # Loads GROQ_API_KEY (and other vars) from .env

router = APIRouter(prefix="/crop-health", tags=["crop-health"])

# Groq client — picks up GROQ_API_KEY from environment after load_dotenv()
client = Groq()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def encode_image_to_base64(file_bytes: bytes) -> str:
    return base64.b64encode(file_bytes).decode("utf-8")


@router.post("/detect")
async def detect_crop_health(file: UploadFile = File(...)):
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG, PNG, WebP, or GIF."
        )

    # Read and encode image
    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:  # 20 MB guard
        raise HTTPException(status_code=400, detail="Image too large. Max size is 20 MB.")

    image_b64 = encode_image_to_base64(file_bytes)
    media_type = file.content_type  # e.g. "image/jpeg"

    # Build the Groq vision request
    prompt = """You are an expert agronomist and plant pathologist.
Analyse the crop image provided and respond ONLY with a valid JSON object — no markdown, no extra text.

The JSON must have exactly these keys:
{
  "disease": "<name of disease or 'Healthy' if no disease found>",
  "confidence": <float between 0.0 and 1.0>,
  "severity": "<Mild | Moderate | Severe | None>",
  "affected_parts": ["<list of plant parts affected, e.g. leaves, stem>"],
  "advice": "<practical, actionable advice for the farmer in 2-3 sentences>",
  "cause": "<explain in 2-3 sentences what causes this disease — include the pathogen type (fungus/bacteria/virus/pest), environmental triggers like humidity or temperature, and how it spreads>",
  "precautions": ["<list of 4-6 specific preventive measures the farmer should take, each as a short actionable sentence>"],
  "recovery_days": {
    "min": <integer — minimum days to recover or control the disease with treatment>,
    "max": <integer — maximum days to recover or control the disease with treatment>,
    "note": "<one sentence explaining what affects recovery speed, e.g. weather, treatment timing, crop variety>"
  }
}

If the crop is Healthy: set cause to 'No disease detected. The crop appears healthy.', precautions to general best-practice tips, and recovery_days min/max to 0 with note 'No treatment needed.'.
If you cannot identify the crop or the image is not of a plant, set disease to 'Unknown', cause to 'Unable to analyse — please upload a clear photo of a crop.', precautions to [], and recovery_days min/max to 0."""

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",  # Groq vision model
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_b64}"
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
            max_tokens=1024,  # increased to accommodate richer response
            temperature=0.2,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    raw_text = response.choices[0].message.content.strip()

    # Strip markdown fences if the model wraps output anyway
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Model returned non-JSON output. Please try again.",
        )

    return JSONResponse(content=result)