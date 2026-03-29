from fastapi import APIRouter, HTTPException
from app.database import supabase, supabase_admin
from app.models.schemas import RegisterRequest, LoginRequest
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

class RefreshRequest(BaseModel):
    token: str

@router.post("/register")
async def register(body: RegisterRequest):
    try:
        res = supabase.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {"full_name": body.full_name}
            }
        })
        return {"message": "Registered!", "user": res.user}
    except Exception as e:
        print("REGISTER ERROR:", str(e))
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(body: LoginRequest):
    try:
        # Single call — login + get session
        res = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })

        # Get role from profile using admin client (bypasses RLS — faster)
        profile = supabase_admin.table("profiles")\
            .select("role")\
            .eq("id", res.user.id)\
            .single()\
            .execute()

        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user_id": res.user.id,
            "email": res.user.email,
            "role": profile.data["role"]
        }
    except Exception as e:
        print("LOGIN ERROR:", str(e))
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    try:
        res = supabase.auth.refresh_session(body.token)
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
        }
    except Exception as e:
        print("REFRESH ERROR:", str(e))
        raise HTTPException(status_code=401, detail="Session expired")