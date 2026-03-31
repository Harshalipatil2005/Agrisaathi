from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from app.database import supabase_admin
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/supply-chain", tags=["supply-chain"])


# ─── Pydantic models ────────────────────────────────────────────────────────

class SupplyChainCreate(BaseModel):
    product_name: str
    origin_farm: str
    location: str
    status: str              # At Farm | In Transit | At Market | Delivered
    equipment_id: Optional[str] = None   # link to an equipment listing if any


class SupplyChainUpdate(BaseModel):
    location: str
    status: str              # At Farm | In Transit | At Market | Delivered


class TrackingLogCreate(BaseModel):
    supply_chain_id: str
    location: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None


VALID_STATUSES = {"At Farm", "In Transit", "At Market", "Delivered"}


# ─── Supply chain routes ──────────────────────────────────────────────────────

@router.post("/add")
async def add_product(data: SupplyChainCreate, user=Depends(get_current_user)):
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of: {VALID_STATUSES}")

    payload = {
        "product_name": data.product_name,
        "origin_farm": data.origin_farm,
        "location": data.location,
        "status": data.status,
        "equipment_id": data.equipment_id,
        "previous_hash": None,
    }
    res = supabase_admin.table("supply_chain").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to add supply chain entry")
    return res.data[0]


@router.post("/update")
async def update_product(data: SupplyChainUpdate, entry_id: str, user=Depends(get_current_user)):
    """
    Creates a new supply chain block that points back to the previous one
    (immutable blockchain-style ledger).
    """
    if data.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of: {VALID_STATUSES}")

    # Fetch the existing entry to carry forward product info
    existing = (
        supabase_admin.table("supply_chain")
        .select("*")
        .eq("id", entry_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Supply chain entry not found")

    prev = existing.data
    payload = {
        "product_name": prev["product_name"],
        "origin_farm": prev["origin_farm"],
        "location": data.location,
        "status": data.status,
        "equipment_id": prev.get("equipment_id"),
        "previous_hash": entry_id,   # links back to previous block
    }
    res = supabase_admin.table("supply_chain").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create update block")
    return res.data[0]


@router.get("/track/{entry_id}")
async def track_product(entry_id: str):
    """
    Walks the chain backwards from entry_id, returning the full journey in
    chronological order (oldest → newest).
    """
    chain = []
    current_id = entry_id

    while current_id:
        res = (
            supabase_admin.table("supply_chain")
            .select("*")
            .eq("id", current_id)
            .single()
            .execute()
        )
        if not res.data:
            break
        chain.append(res.data)
        current_id = res.data.get("previous_hash")   # None stops the loop

    if not chain:
        raise HTTPException(status_code=404, detail="Product not found")

    chain.reverse()  # chronological order
    return chain


@router.get("/all")
async def get_all(equipment_id: Optional[str] = None):
    """Returns the latest block for each product (no duplicates)."""
    query = supabase_admin.table("supply_chain").select("*").order("timestamp", desc=True)
    if equipment_id:
        query = query.eq("equipment_id", equipment_id)
    res = query.execute()

    # De-duplicate: keep only the most recent block per (product_name, origin_farm) pair
    seen = set()
    results = []
    for row in (res.data or []):
        key = (row["product_name"], row["origin_farm"])
        if key not in seen:
            seen.add(key)
            results.append(row)
    return results


@router.get("/product/{entry_id}/full-chain")
async def get_full_chain(entry_id: str):
    """Same as track, but also enriches each block with its IoT tracking logs."""
    chain_res = await track_product(entry_id)

    enriched = []
    for block in chain_res:
        logs_res = (
            supabase_admin.table("tracking_logs")
            .select("*")
            .eq("supply_chain_id", block["id"])
            .order("timestamp", desc=True)
            .execute()
        )
        block["tracking_logs"] = logs_res.data or []
        enriched.append(block)

    return enriched


# ─── Tracking (IoT sensor) routes ─────────────────────────────────────────────

@router.post("/tracking/add")
async def add_tracking_log(data: TrackingLogCreate, user=Depends(get_current_user)):
    sc_res = (
        supabase_admin.table("supply_chain")
        .select("id")
        .eq("id", data.supply_chain_id)
        .single()
        .execute()
    )
    if not sc_res.data:
        raise HTTPException(status_code=404, detail="Supply chain entry not found")

    payload = {
        "supply_chain_id": data.supply_chain_id,
        "location": data.location,
        "temperature": data.temperature,
        "humidity": data.humidity,
    }
    res = supabase_admin.table("tracking_logs").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to add tracking log")
    return res.data[0]


@router.get("/tracking/all")
async def get_all_tracking():
    res = (
        supabase_admin.table("tracking_logs")
        .select("*, supply_chain(product_name, origin_farm, status)")
        .order("timestamp", desc=True)
        .limit(200)
        .execute()
    )
    return res.data or []


@router.get("/tracking/{supply_chain_id}")
async def get_tracking_for_entry(supply_chain_id: str):
    res = (
        supabase_admin.table("tracking_logs")
        .select("*")
        .eq("supply_chain_id", supply_chain_id)
        .order("timestamp", desc=False)
        .execute()
    )
    return res.data or []