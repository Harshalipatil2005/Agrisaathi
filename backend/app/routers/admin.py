from fastapi import APIRouter, Depends
from app.database import supabase_admin
from app.middleware.auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/reports")
async def all_reports(admin=Depends(require_admin)):
    res = supabase_admin.table("reports")\
        .select("*, profiles(email, full_name)")\
        .order("created_at", desc=True)\
        .execute()
    return res.data

@router.get("/users")
async def all_users(admin=Depends(require_admin)):
    res = supabase_admin.table("profiles").select("*").execute()
    return res.data

@router.patch("/reports/{report_id}/status")
async def update_status(report_id: str, status: str, admin=Depends(require_admin)):
    res = supabase_admin.table("reports")\
        .update({"status": status})\
        .eq("id", report_id)\
        .execute()
    return res.data[0]