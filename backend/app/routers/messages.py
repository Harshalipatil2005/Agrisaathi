from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from app.database import supabase_admin
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


# ─── Pydantic models ────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    to_user_id: str
    text: str
    equipment_id: Optional[str] = None


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post("/send")
async def send_message(data: MessageCreate, user=Depends(get_current_user)):
    if str(user.id) == data.to_user_id:
        raise HTTPException(status_code=400, detail="Cannot send messages to yourself")

    payload = {
        "from_user_id": str(user.id),
        "to_user_id": data.to_user_id,
        "text": data.text,
        "equipment_id": data.equipment_id,
        "read": False,
    }
    res = supabase_admin.table("messages").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to send message")
    return res.data[0]


@router.get("/conversation/{other_user_id}")
async def get_conversation(other_user_id: str, user=Depends(get_current_user)):
    """Returns all messages between the current user and another user, sorted oldest→newest."""
    my_id = str(user.id)

    sent = (
        supabase_admin.table("messages")
        .select("*")
        .eq("from_user_id", my_id)
        .eq("to_user_id", other_user_id)
        .execute()
    )
    received = (
        supabase_admin.table("messages")
        .select("*")
        .eq("from_user_id", other_user_id)
        .eq("to_user_id", my_id)
        .execute()
    )

    combined = (sent.data or []) + (received.data or [])
    combined.sort(key=lambda m: m["timestamp"])

    # Mark received messages as read
    supabase_admin.table("messages").update({"read": True}).eq("from_user_id", other_user_id).eq("to_user_id", my_id).eq("read", False).execute()

    return combined


@router.get("/conversation/{user_id}/{other_user_id}")
async def get_conversation_legacy(
    user_id: str, other_user_id: str, user=Depends(get_current_user)
):
    """Legacy endpoint — same as /conversation/{other_user_id} but accepts explicit user_id."""
    if str(user.id) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return await get_conversation(other_user_id, user)


@router.get("/inbox")
async def get_inbox(user=Depends(get_current_user)):
    """
    Returns one entry per conversation partner (most recent message from each thread),
    enriched with the other user's profile.
    """
    my_id = str(user.id)

    # All messages involving this user
    all_res = (
        supabase_admin.table("messages")
        .select("*, profiles!messages_from_user_id_fkey(full_name, avatar_url)")
        .or_(f"from_user_id.eq.{my_id},to_user_id.eq.{my_id}")
        .order("timestamp", desc=True)
        .execute()
    )

    seen_partners: set = set()
    threads = []
    for msg in (all_res.data or []):
        partner = msg["to_user_id"] if msg["from_user_id"] == my_id else msg["from_user_id"]
        if partner not in seen_partners:
            seen_partners.add(partner)
            threads.append({
                "partner_id": partner,
                "last_message": msg["text"],
                "timestamp": msg["timestamp"],
                "unread": not msg["read"] and msg["to_user_id"] == my_id,
                "partner_profile": msg.get("profiles"),
            })

    return threads


@router.get("/unread/count")
async def unread_count(user=Depends(get_current_user)):
    res = (
        supabase_admin.table("messages")
        .select("id", count="exact")
        .eq("to_user_id", str(user.id))
        .eq("read", False)
        .execute()
    )
    return {"unread": res.count or 0}