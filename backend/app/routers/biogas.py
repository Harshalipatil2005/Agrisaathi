from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
import os
import httpx

# ─── Substrate database ───────────────────────────────────────────────────────
# Sources: FAO, IRENA, Indian Biogas Association, peer-reviewed literature
# All values verified against multiple agronomic datasets

SUBSTRATES: dict[str, dict] = {
    # ── Livestock ──
    "cow": {
        "label": "Cow / Cattle",
        "category": "livestock",
        "manure_per_head_kg_day": 10.0,
        "biogas_yield_m3_per_kg": 0.040,   # m³/kg VS, adjusted for Indian conditions
        "methane_fraction": 0.60,
        "c_n_ratio": 24,
        "notes": "Best mixed with crop waste for optimal C:N ratio",
    },
    "buffalo": {
        "label": "Buffalo",
        "category": "livestock",
        "manure_per_head_kg_day": 15.0,
        "biogas_yield_m3_per_kg": 0.038,
        "methane_fraction": 0.60,
        "c_n_ratio": 24,
        "notes": "Similar to cow dung; slightly higher moisture",
    },
    "pig": {
        "label": "Pig",
        "category": "livestock",
        "manure_per_head_kg_day": 2.5,
        "biogas_yield_m3_per_kg": 0.060,
        "methane_fraction": 0.65,
        "c_n_ratio": 10,
        "notes": "High yield; low C:N ratio may need dilution",
    },
    "poultry": {
        "label": "Poultry (Chicken / Duck)",
        "category": "livestock",
        "manure_per_head_kg_day": 0.15,
        "biogas_yield_m3_per_kg": 0.070,
        "methane_fraction": 0.62,
        "c_n_ratio": 8,
        "notes": "High-nitrogen; blend with carbon-rich crop waste",
    },
    "goat_sheep": {
        "label": "Goat / Sheep",
        "category": "livestock",
        "manure_per_head_kg_day": 1.0,
        "biogas_yield_m3_per_kg": 0.045,
        "methane_fraction": 0.60,
        "c_n_ratio": 29,
        "notes": "Lower moisture; good biogas potential",
    },
    "horse": {
        "label": "Horse / Donkey",
        "category": "livestock",
        "manure_per_head_kg_day": 12.0,
        "biogas_yield_m3_per_kg": 0.035,
        "methane_fraction": 0.58,
        "c_n_ratio": 30,
        "notes": "High fibre; may need longer retention time",
    },
    # ── Crop residues ──
    "rice_straw": {
        "label": "Rice Straw",
        "category": "crop_residue",
        "manure_per_head_kg_day": None,
        "biogas_yield_m3_per_kg": 0.190,
        "methane_fraction": 0.55,
        "c_n_ratio": 70,
        "notes": "High lignin; pre-treatment (chopping/soaking) improves yield",
    },
    "wheat_straw": {
        "label": "Wheat Straw",
        "category": "crop_residue",
        "biogas_yield_m3_per_kg": 0.200,
        "methane_fraction": 0.56,
        "c_n_ratio": 80,
        "notes": "Blend with nitrogen-rich inputs for better digestion",
    },
    "sugarcane_bagasse": {
        "label": "Sugarcane Bagasse",
        "category": "crop_residue",
        "biogas_yield_m3_per_kg": 0.220,
        "methane_fraction": 0.57,
        "c_n_ratio": 60,
        "notes": "Good energy content; high fibre needs pre-treatment",
    },
    "maize_stover": {
        "label": "Maize / Corn Stover",
        "category": "crop_residue",
        "biogas_yield_m3_per_kg": 0.240,
        "methane_fraction": 0.58,
        "c_n_ratio": 57,
        "notes": "One of the best crop residues for biogas",
    },
    "cotton_stalks": {
        "label": "Cotton Stalks",
        "category": "crop_residue",
        "biogas_yield_m3_per_kg": 0.180,
        "methane_fraction": 0.54,
        "c_n_ratio": 56,
        "notes": "Woody; chopping to <2 cm recommended",
    },
    "banana_waste": {
        "label": "Banana Pseudostem / Peel",
        "category": "crop_residue",
        "biogas_yield_m3_per_kg": 0.270,
        "methane_fraction": 0.60,
        "c_n_ratio": 30,
        "notes": "High moisture; good yield without pre-treatment",
    },
    "vegetable_waste": {
        "label": "Vegetable / Kitchen Waste",
        "category": "crop_residue",
        "biogas_yield_m3_per_kg": 0.420,
        "methane_fraction": 0.62,
        "c_n_ratio": 20,
        "notes": "Excellent yield; mix with water 1:1 by weight",
    },
    "water_hyacinth": {
        "label": "Water Hyacinth",
        "category": "crop_residue",
        "biogas_yield_m3_per_kg": 0.370,
        "methane_fraction": 0.61,
        "c_n_ratio": 25,
        "notes": "Invasive weed turned resource; high biogas potential",
    },
}

# ─── Schemas ──────────────────────────────────────────────────────────────────

class BiogasInput(BaseModel):
    substrate_key: str = Field(..., description="Key from /biogas/substrates list")
    quantity_kg_day: float = Field(..., gt=0, description="Total substrate kg/day")
    market_rate_inr_per_m3: float = Field(default=50.0, gt=0, description="Local biogas selling rate in INR/m³")
    cooking_hours_per_m3: float = Field(default=2.0, description="Cooking hours per m³ of biogas (typical household stove)")
    include_slurry_value: bool = Field(default=True)
    slurry_value_inr_per_kg: float = Field(default=2.0, description="Value of digested slurry as fertiliser")


class BiogasOutput(BaseModel):
    substrate_label: str
    category: str
    quantity_kg_day: float
    biogas_m3_day: float
    biogas_m3_month: float
    biogas_m3_year: float
    methane_m3_day: float
    cooking_hours_day: float
    slurry_kg_day: float
    biogas_income_day: float
    biogas_income_month: float
    biogas_income_year: float
    slurry_income_day: float
    total_income_day: float
    total_income_month: float
    total_income_year: float
    co2_offset_kg_year: float
    lpg_cylinders_saved_year: float
    c_n_ratio: int
    notes: str
    optimal_retention_days: int


# ─── NEW: Market Rate Schema ──────────────────────────────────────────────────

class MarketRateRequest(BaseModel):
    substrate_key: str = Field(..., description="Substrate key to estimate rate for")
    state: str = Field(default="Maharashtra", description="Indian state for regional pricing context")

class MarketRateResponse(BaseModel):
    estimated_rate_inr_per_m3: float
    range_low: float
    range_high: float
    rationale: str
    source_note: str


# ─── Router ──────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/biogas", tags=["biogas"])


@router.get("/substrates")
def list_substrates():
    """Return all available substrates with labels and categories."""
    return [
        {"key": k, "label": v["label"], "category": v["category"]}
        for k, v in SUBSTRATES.items()
    ]


# ─── NEW: Groq-powered market rate estimator ─────────────────────────────────

@router.post("/market-rate", response_model=MarketRateResponse)
async def estimate_market_rate(req: MarketRateRequest):
    """
    Uses Groq (LLaMA 3) to estimate the current biogas selling/substitution rate
    in INR/m³ for the given substrate and Indian state, so farmers don't need
    to know the price manually.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set in environment.")

    substrate = SUBSTRATES.get(req.substrate_key)
    if not substrate:
        raise HTTPException(status_code=400, detail=f"Unknown substrate '{req.substrate_key}'.")

    substrate_label = substrate["label"]
    category = substrate["category"]

    prompt = f"""You are an expert in Indian rural energy markets and biogas economics.

A farmer in {req.state}, India wants to know the fair market value of biogas 
produced from {substrate_label} (category: {category}).

Provide a realistic estimate of the biogas selling/substitution rate in INR per cubic metre (m³) 
for rural India in 2024-2025. Consider:
- LPG cylinder price parity (14.2 kg cylinder ≈ ₹900-1000)
- 1 m³ biogas ≈ 0.46 kg LPG equivalent
- State-specific subsidies or programs in {req.state}
- Whether this substrate produces higher/lower quality biogas (methane %)
- Typical rates quoted by Indian Biogas Association and MNRE guidelines

Respond ONLY with a valid JSON object, no markdown, no explanation outside JSON:
{{
  "estimated_rate_inr_per_m3": <float, best single estimate>,
  "range_low": <float, conservative lower bound>,
  "range_high": <float, optimistic upper bound>,
  "rationale": "<2-3 sentence plain-language explanation for the farmer>",
  "source_note": "<brief note on basis e.g. LPG parity, MNRE data>"
}}"""

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2,
                    "max_tokens": 400,
                },
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e.response.status_code}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach Groq API: {str(e)}")

    try:
        content = response.json()["choices"][0]["message"]["content"]
        # Strip any accidental markdown fences
        content = content.strip().strip("```json").strip("```").strip()
        import json
        parsed = json.loads(content)
        return MarketRateResponse(
            estimated_rate_inr_per_m3=float(parsed["estimated_rate_inr_per_m3"]),
            range_low=float(parsed["range_low"]),
            range_high=float(parsed["range_high"]),
            rationale=parsed["rationale"],
            source_note=parsed["source_note"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Groq response: {str(e)}")


# ─── Calculate ────────────────────────────────────────────────────────────────

@router.post("/calculate", response_model=BiogasOutput)
def calculate_biogas(data: BiogasInput):
    substrate = SUBSTRATES.get(data.substrate_key)
    if not substrate:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown substrate '{data.substrate_key}'. Call GET /biogas/substrates for valid keys."
        )

    qty = data.quantity_kg_day
    yield_m3_kg = substrate["biogas_yield_m3_per_kg"]
    ch4_frac = substrate["methane_fraction"]

    biogas_day = qty * yield_m3_kg
    methane_day = biogas_day * ch4_frac
    cooking_hours = biogas_day * data.cooking_hours_per_m3
    slurry_day = qty * 0.92

    biogas_income_day = biogas_day * data.market_rate_inr_per_m3
    slurry_income_day = (slurry_day * data.slurry_value_inr_per_kg
                         if data.include_slurry_value else 0.0)
    total_day = biogas_income_day + slurry_income_day

    lpg_kg_year = biogas_day * 365 * 0.46
    co2_offset_year = lpg_kg_year * 3.0
    lpg_cylinders_year = lpg_kg_year / 14.2

    c_n = substrate["c_n_ratio"]
    if c_n < 15:
        retention = 15
    elif c_n < 30:
        retention = 30
    else:
        retention = 40

    return BiogasOutput(
        substrate_label=substrate["label"],
        category=substrate["category"],
        quantity_kg_day=qty,
        biogas_m3_day=round(biogas_day, 3),
        biogas_m3_month=round(biogas_day * 30, 2),
        biogas_m3_year=round(biogas_day * 365, 2),
        methane_m3_day=round(methane_day, 3),
        cooking_hours_day=round(cooking_hours, 2),
        slurry_kg_day=round(slurry_day, 2),
        biogas_income_day=round(biogas_income_day, 2),
        biogas_income_month=round(biogas_income_day * 30, 2),
        biogas_income_year=round(biogas_income_day * 365, 2),
        slurry_income_day=round(slurry_income_day, 2),
        total_income_day=round(total_day, 2),
        total_income_month=round(total_day * 30, 2),
        total_income_year=round(total_day * 365, 2),
        co2_offset_kg_year=round(co2_offset_year, 2),
        lpg_cylinders_saved_year=round(lpg_cylinders_year, 2),
        c_n_ratio=c_n,
        notes=substrate["notes"],
        optimal_retention_days=retention,
    )