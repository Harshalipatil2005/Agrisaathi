from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, supabase_admin
from app.middleware.auth import get_current_user
from app.models.schemas import ReportCreate

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/")
async def get_my_reports(user=Depends(get_current_user)):
    try:
        res = supabase_admin.table("reports")\
            .select("*")\
            .eq("user_id", user["id"])\
            .order("created_at", desc=True)\
            .execute()
        return res.data
    except Exception as e:
        print("GET REPORTS ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_report(body: ReportCreate, user=Depends(get_current_user)):
    try:
        res = supabase_admin.table("reports").insert({
            "user_id": user["id"],
            "title": body.title,
            "description": body.description,
            "category": body.category,
            "location": body.location,
            "data": body.data
        }).execute()
        return res.data[0]
    except Exception as e:
        print("REPORT CREATE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))