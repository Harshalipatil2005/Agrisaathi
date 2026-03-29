from fastapi import APIRouter, Depends
import httpx
import os
from dotenv import load_dotenv
from app.middleware.auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/map", tags=["map"])

@router.get("/aqi")
async def get_aqi(lat: float, lng: float, user=Depends(get_current_user)):
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                f"https://api.openaq.org/v3/locations?coordinates={lat},{lng}&radius=80000&limit=10",
                headers={"accept": "application/json"},
                timeout=15.0
            )
            return res.json()
        except Exception as e:
            print("AQI FETCH ERROR:", str(e))
            return {"results": []}

@router.get("/route")
async def get_route(
    startLng: float, startLat: float,
    endLng: float, endLat: float,
    user=Depends(get_current_user)
):
    ors_key = os.getenv('ORS_API_KEY')
    print("ORS KEY:", ors_key[:8] if ors_key else "NOT FOUND")
    if not ors_key:
        return {"features": []}

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                "https://api.openrouteservice.org/v2/directions/foot-walking",
                params={
                    "api_key": ors_key,
                    "start": f"{startLng},{startLat}",
                    "end": f"{endLng},{endLat}"
                },
                timeout=15.0
            )
            print("ORS STATUS:", res.status_code)
            print("ORS RESPONSE:", res.text[:300])
            return res.json()
        except Exception as e:
            print("ROUTE ERROR:", str(e))
            return {"features": []}