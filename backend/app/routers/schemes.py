from fastapi import APIRouter
from typing import List

router = APIRouter(prefix="/schemes", tags=["schemes"])

# Static data — extend with a DB table if you need CMS control
SCHEMES = [
    {
        "name": "PM-KISAN",
        "type": "Government",
        "url": "https://pmkisan.gov.in/",
        "description": "Income support of ₹6,000 per year to eligible farmer families in three equal instalments.",
    },
    {
        "name": "Pradhan Mantri Fasal Bima Yojana",
        "type": "Government",
        "url": "https://pmfby.gov.in/",
        "description": "Crop insurance scheme providing financial support to farmers suffering crop loss due to unforeseen events.",
    },
    {
        "name": "Kisan Credit Card",
        "type": "Bank",
        "url": "https://www.nabard.org/content.aspx?id=572",
        "description": "Flexible revolving credit for purchasing agricultural inputs and managing farm cash flow.",
    },
    {
        "name": "PM Krishi Sinchai Yojana",
        "type": "Government",
        "url": "https://pmksy.gov.in/",
        "description": "Ensures access to water for every farm and improves water use efficiency ('Har Khet Ko Pani').",
    },
    {
        "name": "SBI Agri Gold Loan",
        "type": "Bank",
        "url": "https://sbi.co.in/web/agri-rural/agriculture-banking/gold-loan",
        "description": "Instant credit against gold ornaments for agricultural and allied activities.",
    },
    {
        "name": "National Agriculture Market (eNAM)",
        "type": "Government",
        "url": "https://enam.gov.in/",
        "description": "Online trading platform integrating mandis to ensure better price discovery for farmers.",
    },
    {
        "name": "NABARD Dairy Entrepreneurship",
        "type": "Bank",
        "url": "https://www.nabard.org/content.aspx?id=591",
        "description": "Subsidy-linked bank loans for dairy infrastructure and purchase of milch animals.",
    },
    {
        "name": "Soil Health Card Scheme",
        "type": "Government",
        "url": "https://soilhealth.dac.gov.in/",
        "description": "Free soil testing and crop-wise nutrient recommendations to improve fertiliser usage.",
    },
]


@router.get("/")
def get_schemes(type: str = None):
    if type:
        return [s for s in SCHEMES if s["type"] == type]
    return SCHEMES