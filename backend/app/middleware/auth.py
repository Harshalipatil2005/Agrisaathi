from fastapi import Depends, HTTPException, Header
from app.database import supabase_admin
from typing import Optional

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token")
    
    token = authorization.split(" ")[1]
    
    try:
        user = supabase_admin.auth.get_user(token)
        
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        profile = supabase_admin.table("profiles")\
            .select("*")\
            .eq("id", user.user.id)\
            .single()\
            .execute()
        
        if not profile.data:
            raise HTTPException(status_code=401, detail="Profile not found")
        
        return {
            "id": user.user.id,
            "email": user.user.email,
            "role": profile.data["role"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print("AUTH ERROR:", str(e))
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    return user