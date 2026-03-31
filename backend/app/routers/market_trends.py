from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/market-trends", tags=["market-trends"])


class MarketTrendsRequest(BaseModel):
    crop: str
    location: str
    latitude: float
    longitude: float
    yield_estimate: Optional[float] = None
    language: Optional[str] = "English"


class ComparePricesRequest(BaseModel):
    crops: List[str]
    location: str
    latitude: float
    longitude: float


class CropPrice(BaseModel):
    crop: str
    current_price: float
    currency: str
    region: str
    unit: str
    market_trend: str
    demand_level: str
    yield_estimate: Optional[float] = None
    price_change_percent: float
    best_season: str
    insights: List[str]


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"  # mixtral-8x7b-32768 was deprecated by Groq

# Startup check — will print in your terminal when the server starts
if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY is not set! Market Trends endpoints will fail.")
else:
    print(f"✅  GROQ_API_KEY loaded (starts with: {GROQ_API_KEY[:8]}...)")


def extract_json(text: str) -> dict:
    """Strip markdown fences and extract the first valid JSON object."""
    # Remove ```json ... ``` or ``` ... ``` wrappers
    text = re.sub(r"```(?:json)?", "", text).strip()
    # Find the first { ... } block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in response: {text[:200]}")
    return json.loads(match.group())


async def groq_chat(prompt: str, max_tokens: int = 600) -> str:
    """Send a prompt to Groq and return the raw content string."""
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment.")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": max_tokens,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(GROQ_URL, json=payload, headers=headers)
        print(f"[Groq] status={response.status_code}")
        if response.status_code != 200:
            print(f"[Groq] error body: {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"Groq API returned {response.status_code}: {response.text[:500]}",
            )
        result = response.json()
        content = result["choices"][0]["message"]["content"].strip()
        print(f"[Groq] raw response (first 300 chars): {content[:300]}")
        return content


async def get_market_prices_from_groq(
    crop: str,
    location: str,
    latitude: float,
    longitude: float,
    yield_estimate: Optional[float] = None,
) -> dict:
    yield_value = yield_estimate if yield_estimate is not None else "null"

    prompt = f"""
You are an Indian agricultural market data assistant.
Provide realistic current market data for {crop} in {location} (lat: {latitude}, lon: {longitude}).

Return ONLY a valid JSON object — no markdown, no code fences, no explanation:
{{
    "crop": "{crop}",
    "region": "{location}",
    "current_price": <realistic INR number>,
    "currency": "INR",
    "unit": "per quintal",
    "market_trend": "bullish" | "bearish" | "stable",
    "demand_level": "high" | "medium" | "low",
    "price_change_percent": <number, can be negative>,
    "best_season": "<month range e.g. Oct-Dec>",
    "yield_estimate": {yield_value},
    "insights": [
        "<insight 1 about this crop in this region>",
        "<insight 2>",
        "<insight 3>"
    ]
}}
Use realistic Indian mandi prices. If exact data is unavailable, use historical patterns.
"""
    content = await groq_chat(prompt, max_tokens=600)
    try:
        return extract_json(content)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Groq response: {e}")


@router.post("/get-prices", response_model=CropPrice)
async def get_market_prices(request: MarketTrendsRequest):
    market_data = await get_market_prices_from_groq(
        crop=request.crop,
        location=request.location,
        latitude=request.latitude,
        longitude=request.longitude,
        yield_estimate=request.yield_estimate,
    )
    return CropPrice(
        crop=market_data.get("crop", request.crop),
        current_price=float(market_data.get("current_price", 0)),
        currency=market_data.get("currency", "INR"),
        region=market_data.get("region", request.location),
        unit=market_data.get("unit", "per quintal"),
        market_trend=market_data.get("market_trend", "stable"),
        demand_level=market_data.get("demand_level", "medium"),
        price_change_percent=float(market_data.get("price_change_percent", 0)),
        best_season=market_data.get("best_season", ""),
        yield_estimate=market_data.get("yield_estimate"),
        insights=market_data.get("insights", []),
    )


@router.post("/compare-prices")  # ← Fixed: POST with body, not query params
async def compare_prices(request: ComparePricesRequest):
    """Compare prices for multiple crops in one Groq call."""
    crops_list = ", ".join(request.crops)

    prompt = f"""
You are an Indian agricultural market data assistant.
Provide realistic current mandi prices for these crops in {request.location} (lat: {request.latitude}, lon: {request.longitude}):
Crops: {crops_list}

Return ONLY a valid JSON object — no markdown, no code fences:
{{
    "crops": [
        {{
            "crop": "<name>",
            "region": "{request.location}",
            "current_price": <INR number>,
            "currency": "INR",
            "unit": "per quintal",
            "market_trend": "bullish" | "bearish" | "stable",
            "demand_level": "high" | "medium" | "low",
            "price_change_percent": <number>,
            "best_season": "<month range>",
            "yield_estimate": null,
            "insights": []
        }}
    ]
}}
Include one entry per crop in the same order as the input list.
"""
    content = await groq_chat(prompt, max_tokens=900)
    try:
        data = extract_json(content)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Groq response: {e}")

    return {
        "region": request.location,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "crops": data.get("crops", []),
    }


@router.get("/trending-crops")
async def get_trending_crops(location: str, latitude: float, longitude: float):
    prompt = f"""
You are an Indian agricultural market data assistant.
List the top 5 crops with the highest market demand and price momentum in {location} (lat: {latitude}, lon: {longitude}) right now.

Return ONLY a valid JSON object — no markdown, no code fences:
{{
    "region": "{location}",
    "trending_crops": [
        {{"crop": "<name>", "market_demand": "high" | "medium" | "low", "price_momentum": "bullish" | "bearish", "profitability": "high" | "medium" | "low"}},
        {{"crop": "<name>", "market_demand": "high" | "medium" | "low", "price_momentum": "bullish" | "bearish", "profitability": "high" | "medium" | "low"}},
        {{"crop": "<name>", "market_demand": "high" | "medium" | "low", "price_momentum": "bullish" | "bearish", "profitability": "high" | "medium" | "low"}},
        {{"crop": "<name>", "market_demand": "high" | "medium" | "low", "price_momentum": "bullish" | "bearish", "profitability": "high" | "medium" | "low"}},
        {{"crop": "<name>", "market_demand": "high" | "medium" | "low", "price_momentum": "bullish" | "bearish", "profitability": "high" | "medium" | "low"}}
    ]
}}
"""
    content = await groq_chat(prompt, max_tokens=500)
    try:
        return extract_json(content)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Groq response: {e}")