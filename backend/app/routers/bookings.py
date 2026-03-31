from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import supabase_admin
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/bookings", tags=["bookings"])


# ─── Pydantic models ────────────────────────────────────────────────────────

class BookingCreate(BaseModel):
    equipment_id: str
    seller_id: str
    booking_type: str        # rent | purchase
    start_date: str          # YYYY-MM-DD
    end_date: Optional[str] = None   # YYYY-MM-DD (null for purchases)
    quantity: int = 1
    total_price: float


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/create")
async def create_booking(data: BookingCreate, user=Depends(get_current_user)):
    # Verify equipment exists and is available
    eq_res = (
        supabase_admin.table("equipment")
        .select("id, available, quantity, price, type")
        .eq("id", data.equipment_id)
        .single()
        .execute()
    )
    if not eq_res.data:
        raise HTTPException(status_code=404, detail="Equipment not found")
    if not eq_res.data.get("available"):
        raise HTTPException(status_code=400, detail="Equipment is not available")

    # Validate booking type matches equipment type
    eq_type = eq_res.data.get("type")
    if eq_type == "rent" and data.booking_type != "rent":
        raise HTTPException(status_code=400, detail="This equipment is for rent only")
    if eq_type == "sell" and data.booking_type != "purchase":
        raise HTTPException(status_code=400, detail="This equipment is for purchase only")

    # For rented equipment, end_date is required
    if data.booking_type == "rent" and not data.end_date:
        raise HTTPException(status_code=400, detail="end_date is required for rentals")

    payload = {
        "user_id": str(user.id),
        "equipment_id": data.equipment_id,
        "seller_id": data.seller_id,
        "booking_type": data.booking_type,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "quantity": data.quantity,
        "total_price": data.total_price,
        "status": "pending",
    }

    res = supabase_admin.table("bookings").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create booking")

    booking = res.data[0]

    # For purchases, optionally mark equipment unavailable if quantity was 1
    if data.booking_type == "purchase":
        qty = eq_res.data.get("quantity")
        if qty is not None and qty <= data.quantity:
            supabase_admin.table("equipment").update({"available": False}).eq("id", data.equipment_id).execute()

    return booking


@router.get("/user/me")
async def get_my_bookings(user=Depends(get_current_user)):
    res = (
        supabase_admin.table("bookings")
        .select("*, equipment(name, category, type, image_url), sellers(name, phone, address)")
        .eq("user_id", str(user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/user/{user_id}")
async def get_user_bookings(user_id: str, user=Depends(get_current_user)):
    # Only allow users to see their own bookings (or admins)
    if str(user.id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    res = (
        supabase_admin.table("bookings")
        .select("*, equipment(name, category, type, image_url)")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/seller/me")
async def get_my_seller_bookings(user=Depends(get_current_user)):
    # Get seller id for this user first
    seller_res = (
        supabase_admin.table("sellers")
        .select("id")
        .eq("user_id", str(user.id))
        .single()
        .execute()
    )
    if not seller_res.data:
        raise HTTPException(status_code=404, detail="No seller profile found")

    seller_id = seller_res.data["id"]
    res = (
        supabase_admin.table("bookings")
        .select("*, equipment(name, category), profiles!bookings_user_id_fkey(full_name, email)")
        .eq("seller_id", seller_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/{booking_id}")
async def get_booking(booking_id: str, user=Depends(get_current_user)):
    res = (
        supabase_admin.table("bookings")
        .select("*, equipment(name, category, type, price, image_url), sellers(name, phone, address)")
        .eq("id", booking_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = res.data
    # Only buyer or seller can view
    seller_res = (
        supabase_admin.table("sellers")
        .select("id")
        .eq("user_id", str(user.id))
        .eq("id", booking.get("seller_id"))
        .execute()
    )
    is_seller = bool(seller_res.data)
    is_buyer = booking.get("user_id") == str(user.id)
    if not is_buyer and not is_seller:
        raise HTTPException(status_code=403, detail="Access denied")

    return booking


def _update_booking_status(booking_id: str, status: str):
    res = (
        supabase_admin.table("bookings")
        .update({"status": status})
        .eq("id", booking_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return res.data[0]


@router.post("/{booking_id}/confirm")
async def confirm_booking(booking_id: str, user=Depends(get_current_user)):
    # Only seller can confirm
    booking = supabase_admin.table("bookings").select("seller_id, status").eq("id", booking_id).single().execute()
    if not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be confirmed")

    seller_res = supabase_admin.table("sellers").select("id").eq("id", booking.data["seller_id"]).eq("user_id", str(user.id)).execute()
    if not seller_res.data:
        raise HTTPException(status_code=403, detail="Only the seller can confirm bookings")

    return _update_booking_status(booking_id, "confirmed")


@router.post("/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user=Depends(get_current_user)):
    booking = supabase_admin.table("bookings").select("user_id, seller_id, status, equipment_id, booking_type").eq("id", booking_id).single().execute()
    if not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.data["status"] in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail="Booking already completed or cancelled")

    # Buyer or seller can cancel
    seller_res = supabase_admin.table("sellers").select("id").eq("id", booking.data["seller_id"]).eq("user_id", str(user.id)).execute()
    is_seller = bool(seller_res.data)
    is_buyer = booking.data["user_id"] == str(user.id)
    if not is_buyer and not is_seller:
        raise HTTPException(status_code=403, detail="Not authorised to cancel this booking")

    result = _update_booking_status(booking_id, "cancelled")

    # Re-enable availability on purchase cancellation
    if booking.data["booking_type"] == "purchase":
        supabase_admin.table("equipment").update({"available": True}).eq("id", booking.data["equipment_id"]).execute()

    return result


@router.post("/{booking_id}/complete")
async def complete_booking(booking_id: str, user=Depends(get_current_user)):
    booking = supabase_admin.table("bookings").select("seller_id, status").eq("id", booking_id).single().execute()
    if not booking.data:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.data["status"] != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be completed")

    seller_res = supabase_admin.table("sellers").select("id").eq("id", booking.data["seller_id"]).eq("user_id", str(user.id)).execute()
    if not seller_res.data:
        raise HTTPException(status_code=403, detail="Only the seller can mark as completed")

    return _update_booking_status(booking_id, "completed")