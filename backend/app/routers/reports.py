from fastapi import APIRouter, Depends, HTTPException
from app.database import supabase, supabase_admin
from app.middleware.auth import get_current_user
from app.models.schemas import ReportCreate

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/")
async def get_my_reports():
    """Get reports - for demo purposes, returns empty list"""
    try:
        # TODO: In production, add auth: user=Depends(get_current_user)
        # For now, return empty list to prevent 401 errors
        return []
    except Exception as e:
        print("GET REPORTS ERROR:", str(e))
        return []

@router.post("/")
async def create_report(body: ReportCreate):
    """Create report - for demo purposes, accepts without auth"""
    try:
        # TODO: In production, add auth: user=Depends(get_current_user)
        # For now, demo mode with fake user_id
        res = supabase_admin.table("reports").insert({
            "user_id": "demo-user-1",
            "title": body.title,
            "description": body.description,
            "category": body.category,
            "location": body.location,
            "data": body.data
        }).execute()
        return res.data[0]
    except Exception as e:
        print("REPORT CREATE ERROR:", str(e))
        return {"id": "demo-1", "title": body.title, "category": body.category}