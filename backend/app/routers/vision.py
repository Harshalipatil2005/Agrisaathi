from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import httpx
import base64
import os
import json
import re
from dotenv import load_dotenv
from app.middleware.auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/vision", tags=["vision"])

@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    try:
        image_data = await file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        media_type = file.content_type or "image/jpeg"

        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{media_type};base64,{base64_image}"
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": """Analyze this image for environmental/waste issues.
Respond ONLY in this exact JSON format, nothing else:
{
    "category": "plastic|food|hazardous|general",
    "title": "short title under 8 words",
    "description": "1-2 sentence description of what you see",
    "severity": "low|medium|high",
    "detected": true
}
If no waste or environmental issue is detected, set detected to false and category to general."""
                                }
                            ]
                        }
                    ],
                    "max_tokens": 200,
                    "temperature": 0.1
                },
                timeout=30.0
            )

            data = res.json()
            print("VISION STATUS:", res.status_code)
            print("VISION RESPONSE:", data)

            if res.status_code != 200:
                raise HTTPException(status_code=500, detail=f"Vision API error: {data}")

            raw = data["choices"][0]["message"]["content"]
            match = re.search(r'\{.*\}', raw, re.DOTALL)
            if match:
                result = json.loads(match.group())
            else:
                result = {
                    "category": "general",
                    "title": "Environmental issue detected",
                    "description": raw[:200],
                    "severity": "medium",
                    "detected": True
                }
            return result

    except HTTPException:
        raise
    except Exception as e:
        print("VISION ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))