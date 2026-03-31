from fastapi import Header, HTTPException, Depends
from app.database import supabase_admin
from fastapi import APIRouter

router = APIRouter()

async def get_current_user(authorization: str = Header(...)):
    """
    Extracts and verifies the Supabase JWT from the Authorization header.
    Returns the user dict from auth.users.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        response = supabase_admin.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return response.user
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


async def require_admin(user=Depends(get_current_user)):
    """Only allows users with role='admin' in the profiles table."""
    res = (
        supabase_admin.table("profiles")
        .select("role")
        .eq("id", str(user.id))
        .single()
        .execute()
    )
    if not res.data or res.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user