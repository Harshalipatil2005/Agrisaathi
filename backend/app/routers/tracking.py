from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import uuid
import datetime

router = APIRouter(prefix="/tracking", tags=["tracking"])

# In-memory storage for demo
tracking_data: List[dict] = []

class TrackingCreate(BaseModel):
    product_id: str
    location: str
    temperature: float
    humidity: float

@router.post("/add")
def add_tracking(data: TrackingCreate):
    entry = {
        "id": str(uuid.uuid4()),
        "product_id": data.product_id,
        "location": data.location,
        "temperature": data.temperature,
        "humidity": data.humidity,
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }
    tracking_data.append(entry)
    return entry

@router.get("/product/{product_id}")
def get_tracking(product_id: str):
    return [entry for entry in tracking_data if entry["product_id"] == product_id]

@router.get("/all")
def get_all():
    return tracking_data
