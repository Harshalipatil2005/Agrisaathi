from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import uuid as uuid_lib
from app.database import supabase_admin
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/equipment", tags=["equipment"])


# ─── Pydantic models ────────────────────────────────────────────────────────

class SellerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class EquipmentCreate(BaseModel):
    seller_id: str
    name: str
    description: Optional[str] = None
    # category: equipment | tools | manpower | fruit | vegetable | fertilizer | farming
    category: str
    type: str       # rent | sell
    price: float
    quantity: Optional[int] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    available: Optional[bool] = None
    image_url: Optional[str] = None


# ─── Helper ─────────────────────────────────────────────────────────────────

def validate_uuid(value: str, label: str = "ID"):
    try:
        uuid_lib.UUID(value)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Invalid {label}: {value}")


# ─── Seller routes ───────────────────────────────────────────────────────────
# CRITICAL: All fixed-path routes must come BEFORE /{equipment_id}
# Otherwise FastAPI routes "/seller/me" → /{equipment_id} with equipment_id="seller"

@router.post("/seller/register")
async def register_seller(data: SellerCreate, user=Depends(get_current_user)):
    payload = {
        "user_id": str(user.id),
        "name": data.name,
        "phone": data.phone,
        "address": data.address,
        "latitude": data.latitude,
        "longitude": data.longitude,
    }
    res = supabase_admin.table("sellers").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to register seller")
    return res.data[0]


@router.get("/seller/me")
async def get_my_seller_profile(user=Depends(get_current_user)):
    res = (
        supabase_admin.table("sellers")
        .select("*")
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="No seller profile found for this user")
    return res.data


@router.get("/seller/profile/{seller_id}")
async def get_seller_profile(seller_id: str):
    validate_uuid(seller_id, "seller_id")

    seller_res = (
        supabase_admin.table("sellers")
        .select("*")
        .eq("id", seller_id)
        .single()
        .execute()
    )
    if not seller_res.data:
        raise HTTPException(status_code=404, detail="Seller not found")

    equipment_res = (
        supabase_admin.table("equipment")
        .select("*")
        .eq("seller_id", seller_id)
        .eq("available", True)
        .execute()
    )
    return {"seller": seller_res.data, "equipment": equipment_res.data or []}


# ─── Equipment list / filter routes ─────────────────────────────────────────
# These must also come before /{equipment_id}

@router.get("/")
async def get_all_equipment(
    category: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    section: Optional[str] = None,  # "equipment" | "products"
):
    """
    section=equipment  → categories: equipment, tools, manpower
    section=products   → categories: fruit, vegetable, fertilizer, farming
    category=all or omitted → no category filter
    """
    query = (
        supabase_admin.table("equipment")
        .select("*, sellers(name, phone, address, latitude, longitude)")
        .eq("available", True)
    )

    # Section filter groups categories for the two-tab UI
    if section == "equipment":
        query = query.in_("category", ["equipment", "tools", "manpower"])
    elif section == "products":
        query = query.in_("category", ["fruit", "vegetable", "fertilizer", "farming"])
    elif category and category != "all":
        query = query.eq("category", category)

    if type and type in ("rent", "sell"):
        query = query.eq("type", type)

    if search:
        query = query.ilike("name", f"%{search}%")

    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.get("/my")
async def get_my_equipment(user=Depends(get_current_user)):
    """Get all equipment listed by the current user's seller profile."""
    seller_res = (
        supabase_admin.table("sellers")
        .select("id")
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not seller_res.data:
        raise HTTPException(status_code=404, detail="No seller profile found")

    res = (
        supabase_admin.table("equipment")
        .select("*")
        .eq("seller_id", seller_res.data["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/category/{category}")
async def get_by_category(category: str):
    res = (
        supabase_admin.table("equipment")
        .select("*, sellers(name, address)")
        .eq("category", category)
        .eq("available", True)
        .execute()
    )
    return res.data or []


@router.get("/seller/{seller_id}")
async def get_seller_equipment(seller_id: str):
    validate_uuid(seller_id, "seller_id")
    res = (
        supabase_admin.table("equipment")
        .select("*")
        .eq("seller_id", seller_id)
        .execute()
    )
    return res.data or []


@router.post("/add")
async def add_equipment(data: EquipmentCreate, user=Depends(get_current_user)):
    validate_uuid(data.seller_id, "seller_id")

    seller_res = (
        supabase_admin.table("sellers")
        .select("id")
        .eq("id", data.seller_id)
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not seller_res.data:
        raise HTTPException(status_code=403, detail="Seller not found or not yours")

    payload = data.model_dump()
    res = supabase_admin.table("equipment").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to add equipment")
    return res.data[0]


# ─── /{equipment_id} routes LAST ─────────────────────────────────────────────
# These are wildcards — they must come after all fixed-path routes above.
# Previously "/equipment/docs" was crashing because it hit this route with id="docs"

@router.get("/{equipment_id}")
async def get_equipment(equipment_id: str):
    validate_uuid(equipment_id, "equipment_id")  # returns 404 cleanly for non-UUIDs

    res = (
        supabase_admin.table("equipment")
        .select("*, sellers(id, name, phone, address, latitude, longitude, user_id)")
        .eq("id", equipment_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Equipment not found")

    item = res.data
    seller_raw = item.pop("sellers", None)
    seller = None
    if seller_raw:
        seller = {
            "seller_id": seller_raw["id"],
            "name": seller_raw["name"],
            "phone": seller_raw["phone"],
            "address": seller_raw["address"],
            "latitude": seller_raw.get("latitude"),
            "longitude": seller_raw.get("longitude"),
            "user_id": seller_raw["user_id"],
        }
    return {"equipment": item, "seller": seller}


@router.patch("/{equipment_id}")
async def update_equipment(
    equipment_id: str, data: EquipmentUpdate, user=Depends(get_current_user)
):
    validate_uuid(equipment_id, "equipment_id")

    eq_res = (
        supabase_admin.table("equipment")
        .select("seller_id")
        .eq("id", equipment_id)
        .single()
        .execute()
    )
    if not eq_res.data:
        raise HTTPException(status_code=404, detail="Equipment not found")

    seller_res = (
        supabase_admin.table("sellers")
        .select("id")
        .eq("id", eq_res.data["seller_id"])
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not seller_res.data:
        raise HTTPException(status_code=403, detail="Not your equipment")

    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    res = (
        supabase_admin.table("equipment")
        .update(updates)
        .eq("id", equipment_id)
        .execute()
    )
    return res.data[0] if res.data else {}


@router.delete("/{equipment_id}")
async def delete_equipment(equipment_id: str, user=Depends(get_current_user)):
    validate_uuid(equipment_id, "equipment_id")

    eq_res = (
        supabase_admin.table("equipment")
        .select("seller_id")
        .eq("id", equipment_id)
        .single()
        .execute()
    )
    if not eq_res.data:
        raise HTTPException(status_code=404, detail="Equipment not found")

    seller_res = (
        supabase_admin.table("sellers")
        .select("id")
        .eq("id", eq_res.data["seller_id"])
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not seller_res.data:
        raise HTTPException(status_code=403, detail="Not your equipment")

    supabase_admin.table("equipment").delete().eq("id", equipment_id).execute()
    return {"success": True}