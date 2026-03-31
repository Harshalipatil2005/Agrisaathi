from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import datetime
import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/soil-lab", tags=["soil-lab"])

# In-memory storage for demo
soil_reports: List[dict] = []


# ─── Schema ───────────────────────────────────────────────────────────────────

class SoilReportCreate(BaseModel):
    user_id: str

    # ── Primary macronutrients ──
    ph: float = Field(..., ge=0, le=14, description="Soil pH (0–14)")
    n: float = Field(..., ge=0, description="Nitrogen (kg/ha)")
    p: float = Field(..., ge=0, description="Phosphorus (kg/ha)")
    k: float = Field(..., ge=0, description="Potassium (kg/ha)")

    # ── Secondary nutrients ──
    sulfur: Optional[float] = Field(None, ge=0, description="Sulfur (ppm)")
    calcium: Optional[float] = Field(None, ge=0, description="Calcium (meq/100g)")
    magnesium: Optional[float] = Field(None, ge=0, description="Magnesium (meq/100g)")

    # ── Micronutrients ──
    zinc: Optional[float] = Field(None, ge=0, description="Zinc (ppm)")
    iron: Optional[float] = Field(None, ge=0, description="Iron (ppm)")
    manganese: Optional[float] = Field(None, ge=0, description="Manganese (ppm)")
    copper: Optional[float] = Field(None, ge=0, description="Copper (ppm)")
    boron: Optional[float] = Field(None, ge=0, description="Boron (ppm)")

    # ── Physical properties ──
    organic_carbon: Optional[float] = Field(None, ge=0, description="Organic Carbon (%)")
    organic_matter: Optional[float] = Field(None, ge=0, description="Organic Matter (%)")
    electrical_conductivity: Optional[float] = Field(None, ge=0, description="EC (dS/m) — salinity indicator")
    moisture: Optional[float] = Field(None, ge=0, le=100, description="Soil moisture (%)")
    texture: Optional[str] = Field(None, description="Soil texture: Sandy / Loamy / Clay / Silt / Sandy Loam / Clay Loam")

    # ── Location context ──
    state: Optional[str] = Field(None, description="Indian state for region-specific advice")
    season: Optional[str] = Field(None, description="Current/upcoming season: Kharif / Rabi / Zaid")

    # ── Legacy / extras ──
    no2: Optional[float] = Field(None, ge=0, description="Nitrite (ppm)")
    other_params: Optional[dict] = None


# ─── Groq AI recommendation ──────────────────────────────────────────────────

async def get_groq_recommendation(report: dict) -> dict:
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment.")

    # Build a readable soil summary for the prompt
    params = []
    params.append(f"pH: {report['ph']}")
    params.append(f"Nitrogen (N): {report['n']} kg/ha")
    params.append(f"Phosphorus (P): {report['p']} kg/ha")
    params.append(f"Potassium (K): {report['k']} kg/ha")
    if report.get("sulfur") is not None:       params.append(f"Sulfur: {report['sulfur']} ppm")
    if report.get("calcium") is not None:      params.append(f"Calcium: {report['calcium']} meq/100g")
    if report.get("magnesium") is not None:    params.append(f"Magnesium: {report['magnesium']} meq/100g")
    if report.get("zinc") is not None:         params.append(f"Zinc: {report['zinc']} ppm")
    if report.get("iron") is not None:         params.append(f"Iron: {report['iron']} ppm")
    if report.get("manganese") is not None:    params.append(f"Manganese: {report['manganese']} ppm")
    if report.get("copper") is not None:       params.append(f"Copper: {report['copper']} ppm")
    if report.get("boron") is not None:        params.append(f"Boron: {report['boron']} ppm")
    if report.get("organic_carbon") is not None: params.append(f"Organic Carbon: {report['organic_carbon']}%")
    if report.get("organic_matter") is not None: params.append(f"Organic Matter: {report['organic_matter']}%")
    if report.get("electrical_conductivity") is not None: params.append(f"EC: {report['electrical_conductivity']} dS/m")
    if report.get("moisture") is not None:     params.append(f"Moisture: {report['moisture']}%")
    if report.get("texture"):                  params.append(f"Texture: {report['texture']}")
    if report.get("no2") is not None:          params.append(f"Nitrite (NO2): {report['no2']} ppm")
    if report.get("other_params"):
        for k, v in report["other_params"].items():
            params.append(f"{k}: {v}")

    state_info = f"Location: {report['state']}, India" if report.get("state") else "Location: India (state not specified)"
    season_info = f"Season: {report['season']}" if report.get("season") else "Season: not specified"

    soil_summary = "\n".join(params)

    prompt = f"""You are an expert Indian agronomist and soil scientist with deep knowledge of Indian crops, soil health, and farming practices.

A farmer has submitted the following soil test report:

{soil_summary}
{state_info}
{season_info}

Based on this soil data, provide a comprehensive analysis. Respond ONLY with a valid JSON object — no markdown, no explanation outside JSON:

{{
  "soil_health_score": <integer 0-100, overall soil health>,
  "soil_health_label": "<Poor / Fair / Good / Excellent>",
  "ph_status": "<Acidic / Slightly Acidic / Neutral / Slightly Alkaline / Alkaline>",
  "ph_advice": "<1-2 sentences on pH management if needed>",

  "nutrient_status": {{
    "nitrogen": "<Deficient / Low / Adequate / High>",
    "phosphorus": "<Deficient / Low / Adequate / High>",
    "potassium": "<Deficient / Low / Adequate / High>"
  }},

  "recommended_crops": [
    {{
      "name": "<crop name in English>",
      "local_name": "<Hindi/Marathi name if applicable>",
      "suitability": "<High / Medium>",
      "reason": "<1 sentence why this crop suits the soil>",
      "expected_yield": "<rough yield range e.g. 30-40 q/ha>",
      "season": "<Kharif / Rabi / Zaid / Year-round>"
    }}
  ],

  "avoid_crops": [
    {{
      "name": "<crop to avoid>",
      "reason": "<brief reason>"
    }}
  ],

  "fertilizer_recommendations": [
    {{
      "fertilizer": "<fertilizer name>",
      "dose": "<dose e.g. 120 kg/ha>",
      "timing": "<when to apply>",
      "reason": "<why this is needed>"
    }}
  ],

  "soil_improvement_tips": [
    "<actionable tip 1>",
    "<actionable tip 2>",
    "<actionable tip 3>"
  ],

  "biogas_slurry_advice": "<1-2 sentences on whether digested biogas slurry would benefit this soil>",

  "warnings": [
    "<any critical issue e.g. high salinity, toxicity, severe deficiency>"
  ],

  "summary": "<3-4 sentence plain-language summary for the farmer>"
}}

Rules:
- recommend_crops must have at least 5 crops, max 10
- avoid_crops must have at least 2 entries
- fertilizer_recommendations must have at least 3 entries
- Be specific to Indian conditions and the given state/season if provided
- Use realistic Indian yield figures
- warnings can be an empty array [] if no critical issues"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 2000,
                },
            )
            res.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=502, detail=f"Groq API error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=502, detail=f"Could not reach Groq: {str(e)}")

    try:
        content = res.json()["choices"][0]["message"]["content"]
        # Strip accidental markdown fences
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        content = content.strip()
        return json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Groq response: {str(e)}")


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/add")
async def add_soil_report(data: SoilReportCreate):
    """
    Submit a soil test report. Groq AI analyses the data and returns
    crop recommendations, fertiliser advice, soil health score, and warnings.
    """
    report = {
        "id": str(uuid.uuid4()),
        "user_id": data.user_id,
        "timestamp": datetime.datetime.utcnow().isoformat(),

        # Primary
        "ph": data.ph,
        "n": data.n,
        "p": data.p,
        "k": data.k,

        # Secondary
        "sulfur": data.sulfur,
        "calcium": data.calcium,
        "magnesium": data.magnesium,

        # Micro
        "zinc": data.zinc,
        "iron": data.iron,
        "manganese": data.manganese,
        "copper": data.copper,
        "boron": data.boron,

        # Physical
        "organic_carbon": data.organic_carbon,
        "organic_matter": data.organic_matter,
        "electrical_conductivity": data.electrical_conductivity,
        "moisture": data.moisture,
        "texture": data.texture,

        # Context
        "state": data.state,
        "season": data.season,

        # Legacy
        "no2": data.no2,
        "other_params": data.other_params,
    }

    # Get AI analysis from Groq
    ai_analysis = await get_groq_recommendation(report)
    report["ai_analysis"] = ai_analysis

    # Keep a simple flat recommendation list for backward compatibility
    report["recommendation"] = [c["name"] for c in ai_analysis.get("recommended_crops", [])]

    soil_reports.append(report)
    return report


@router.get("/user/{user_id}")
def get_reports(user_id: str):
    """Get all soil reports for a specific user."""
    reports = [r for r in soil_reports if r["user_id"] == user_id]
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this user.")
    return reports


@router.get("/user/{user_id}/latest")
def get_latest_report(user_id: str):
    """Get the most recent soil report for a user."""
    reports = [r for r in soil_reports if r["user_id"] == user_id]
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this user.")
    return sorted(reports, key=lambda r: r["timestamp"], reverse=True)[0]


@router.get("/report/{report_id}")
def get_report_by_id(report_id: str):
    """Get a specific report by its ID."""
    for r in soil_reports:
        if r["id"] == report_id:
            return r
    raise HTTPException(status_code=404, detail="Report not found.")


@router.delete("/report/{report_id}")
def delete_report(report_id: str):
    """Delete a specific report."""
    global soil_reports
    before = len(soil_reports)
    soil_reports = [r for r in soil_reports if r["id"] != report_id]
    if len(soil_reports) == before:
        raise HTTPException(status_code=404, detail="Report not found.")
    return {"deleted": report_id}


@router.get("/all")
def get_all():
    """Get all soil reports (admin use)."""
    return soil_reports


# ─── Parameter reference endpoint ────────────────────────────────────────────

@router.get("/parameters")
def get_parameters():
    """Returns the full list of accepted soil parameters with units and typical ranges."""
    return {
        "primary_macronutrients": {
            "ph": {"unit": "unitless", "optimal_range": "6.0–7.5", "description": "Soil acidity/alkalinity"},
            "n": {"unit": "kg/ha", "optimal_range": ">280 (high), 140-280 (medium), <140 (low)", "description": "Nitrogen"},
            "p": {"unit": "kg/ha", "optimal_range": ">25 (high), 11-25 (medium), <11 (low)", "description": "Phosphorus"},
            "k": {"unit": "kg/ha", "optimal_range": ">300 (high), 121-300 (medium), <121 (low)", "description": "Potassium"},
        },
        "secondary_nutrients": {
            "sulfur": {"unit": "ppm", "optimal_range": ">10"},
            "calcium": {"unit": "meq/100g", "optimal_range": "2–20"},
            "magnesium": {"unit": "meq/100g", "optimal_range": "0.5–5"},
        },
        "micronutrients": {
            "zinc": {"unit": "ppm", "optimal_range": ">0.6"},
            "iron": {"unit": "ppm", "optimal_range": ">4.5"},
            "manganese": {"unit": "ppm", "optimal_range": ">2"},
            "copper": {"unit": "ppm", "optimal_range": ">0.2"},
            "boron": {"unit": "ppm", "optimal_range": ">0.5"},
        },
        "physical": {
            "organic_carbon": {"unit": "%", "optimal_range": ">0.75"},
            "organic_matter": {"unit": "%", "optimal_range": ">1.5"},
            "electrical_conductivity": {"unit": "dS/m", "optimal_range": "<2 (non-saline)"},
            "moisture": {"unit": "%", "optimal_range": "varies by crop"},
            "texture": {"values": ["Sandy", "Loamy", "Clay", "Silt", "Sandy Loam", "Clay Loam"]},
        },
        "context": {
            "state": "Indian state name",
            "season": {"values": ["Kharif", "Rabi", "Zaid"]},
        },
    }