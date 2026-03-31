from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.database import supabase_admin
from app.middleware.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


class ReportStatusUpdate(BaseModel):
    status: str   # open | in_review | resolved | closed


@router.get("/reports")
async def all_reports(admin=Depends(require_admin)):
    res = (
        supabase_admin.table("reports")
        .select("*, profiles(email, full_name)")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/users")
async def all_users(admin=Depends(require_admin)):
    res = supabase_admin.table("profiles").select("*").order("created_at", desc=True).execute()
    return res.data or []


@router.patch("/reports/{report_id}/status")
async def update_report_status(
    report_id: str, body: ReportStatusUpdate, admin=Depends(require_admin)
):
    res = (
        supabase_admin.table("reports")
        .update({"status": body.status})
        .eq("id", report_id)
        .execute()
    )
    return res.data[0] if res.data else {}


@router.get("/stats")
async def dashboard_stats(admin=Depends(require_admin)):
    users_res = supabase_admin.table("profiles").select("id", count="exact").execute()
    sellers_res = supabase_admin.table("sellers").select("id", count="exact").execute()
    equipment_res = supabase_admin.table("equipment").select("id", count="exact").execute()
    bookings_res = supabase_admin.table("bookings").select("id", count="exact").execute()
    reports_res = supabase_admin.table("reports").select("id", count="exact").eq("status", "open").execute()
    supply_res = supabase_admin.table("supply_chain").select("id", count="exact").execute()

    return {
        "total_users": users_res.count or 0,
        "total_sellers": sellers_res.count or 0,
        "total_equipment": equipment_res.count or 0,
        "total_bookings": bookings_res.count or 0,
        "open_reports": reports_res.count or 0,
        "supply_chain_entries": supply_res.count or 0,
    }


@router.get("/bookings")
async def all_bookings(admin=Depends(require_admin)):
    res = (
        supabase_admin.table("bookings")
        .select("*, equipment(name, category), profiles!bookings_user_id_fkey(full_name, email), sellers(name)")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []