"""
Subscription + Auth (Emergent Google Auth + PayPal) module.
- 3-day trial per user (from first login)
- $1/month subscription OR $20 lifetime via PayPal
- Session cookie based auth
Mounted on the main FastAPI app as an additional router.
"""
from __future__ import annotations
import os
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response, Cookie, Header
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

# ── DB ────────────────────────────────────────────────────────────────
_MONGO_URL = os.environ["MONGO_URL"]
_DB_NAME = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(_MONGO_URL)
_db = _client[_DB_NAME]

# ── Constants ─────────────────────────────────────────────────────────
TRIAL_DAYS = 3
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "sandbox")
PAYPAL_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET", "")

PLAN_MONTHLY_PRICE = "1.00"
PLAN_LIFETIME_PRICE = "20.00"

router = APIRouter(prefix="/api")


# ── Models ────────────────────────────────────────────────────────────
class SessionExchangeReq(BaseModel):
    session_id: str


class OrderReq(BaseModel):
    plan: str  # "monthly" or "lifetime"


# ── Helpers ───────────────────────────────────────────────────────────
async def _get_user_by_token(token: Optional[str]):
    if not token:
        return None
    sess = await _db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        return None
    exp = sess.get("expires_at")
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        return None
    user = await _db.app_users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    return user


def _extract_token(session_token_cookie: Optional[str], authorization: Optional[str]) -> Optional[str]:
    if session_token_cookie:
        return session_token_cookie
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return None


def _subscription_state(user: dict) -> dict:
    now = datetime.now(timezone.utc)
    plan = user.get("plan")  # "monthly" | "lifetime" | None
    plan_expires = user.get("plan_expires_at")
    if isinstance(plan_expires, str):
        try:
            plan_expires = datetime.fromisoformat(plan_expires)
        except Exception:
            plan_expires = None
    if plan_expires and plan_expires.tzinfo is None:
        plan_expires = plan_expires.replace(tzinfo=timezone.utc)

    is_lifetime = plan == "lifetime"
    is_monthly_active = plan == "monthly" and plan_expires and plan_expires > now

    trial_start = user.get("trial_start_at")
    if isinstance(trial_start, str):
        trial_start = datetime.fromisoformat(trial_start)
    if trial_start and trial_start.tzinfo is None:
        trial_start = trial_start.replace(tzinfo=timezone.utc)

    trial_end = trial_start + timedelta(days=TRIAL_DAYS) if trial_start else now
    trial_seconds_left = max(0, int((trial_end - now).total_seconds()))
    trial_active = trial_seconds_left > 0 and not is_lifetime and not is_monthly_active

    is_active = is_lifetime or is_monthly_active or trial_active

    return {
        "is_active": is_active,
        "plan": "lifetime" if is_lifetime else ("monthly" if is_monthly_active else None),
        "trial_active": trial_active,
        "trial_seconds_left": trial_seconds_left,
        "trial_days_left": (trial_seconds_left + 86399) // 86400,
        "trial_end_at": trial_end.isoformat() if trial_start else None,
        "plan_expires_at": plan_expires.isoformat() if plan_expires else None,
    }


async def _paypal_access_token() -> str:
    if not PAYPAL_CLIENT_ID or not PAYPAL_SECRET:
        raise HTTPException(500, "PayPal no configurado. Añade PAYPAL_CLIENT_ID y PAYPAL_SECRET en backend/.env")
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"{PAYPAL_BASE}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            headers={"Accept": "application/json"},
        )
        if r.status_code != 200:
            raise HTTPException(500, f"PayPal auth error: {r.text}")
        return r.json()["access_token"]


# ── Auth Endpoints ────────────────────────────────────────────────────
@router.post("/auth/session")
async def auth_session(body: SessionExchangeReq, response: Response):
    """Exchange Emergent session_id → session_token cookie, create/update user, start trial."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "Session inválida")
    data = r.json()
    email = data["email"]
    name = data.get("name", "")
    picture = data.get("picture", "")
    session_token = data["session_token"]

    now = datetime.now(timezone.utc)
    existing = await _db.app_users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await _db.app_users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture, "last_login_at": now.isoformat()}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await _db.app_users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "trial_start_at": now.isoformat(),
            "plan": None,
            "plan_expires_at": None,
            "created_at": now.isoformat(),
            "last_login_at": now.isoformat(),
        })

    await _db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    user = await _db.app_users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user, "subscription": _subscription_state(user), "session_token": session_token}


@router.get("/auth/me")
async def auth_me(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "No autenticado")
    return {"user": user, "subscription": _subscription_state(user)}


@router.post("/auth/logout")
async def auth_logout(
    response: Response,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    if token:
        await _db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


@router.get("/subscription/status")
async def subscription_status(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "No autenticado")
    return _subscription_state(user)


# ── PayPal Endpoints ─────────────────────────────────────────────────
@router.get("/paypal/config")
async def paypal_config():
    return {
        "client_id": PAYPAL_CLIENT_ID,
        "mode": PAYPAL_MODE,
        "configured": bool(PAYPAL_CLIENT_ID and PAYPAL_SECRET),
        "plans": {
            "monthly": {"price": PLAN_MONTHLY_PRICE, "currency": "USD", "label": "Mensual"},
            "lifetime": {"price": PLAN_LIFETIME_PRICE, "currency": "USD", "label": "Para siempre"},
        },
    }


@router.post("/paypal/create-order")
async def paypal_create_order(
    body: OrderReq,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "No autenticado")
    if body.plan not in ("monthly", "lifetime"):
        raise HTTPException(400, "Plan inválido")
    price = PLAN_LIFETIME_PRICE if body.plan == "lifetime" else PLAN_MONTHLY_PRICE
    label = "Acceso de por vida" if body.plan == "lifetime" else "Suscripción mensual"

    access = await _paypal_access_token()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{PAYPAL_BASE}/v2/checkout/orders",
            headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "reference_id": f"{user['user_id']}|{body.plan}",
                    "description": f"Reserva Eventos — {label}",
                    "amount": {"currency_code": "USD", "value": price},
                }],
            },
        )
    if r.status_code not in (200, 201):
        raise HTTPException(500, f"PayPal error: {r.text}")
    return r.json()


@router.post("/paypal/capture/{order_id}")
async def paypal_capture(
    order_id: str,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "No autenticado")

    access = await _paypal_access_token()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{PAYPAL_BASE}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {access}", "Content-Type": "application/json"},
        )
    if r.status_code not in (200, 201):
        raise HTTPException(500, f"PayPal capture error: {r.text}")
    data = r.json()
    if data.get("status") != "COMPLETED":
        raise HTTPException(400, f"Pago no completado: {data.get('status')}")

    # Extract plan from reference_id
    try:
        ref = data["purchase_units"][0]["reference_id"]
        _, plan = ref.split("|", 1)
    except Exception:
        raise HTTPException(400, "reference_id inválido")

    now = datetime.now(timezone.utc)
    update = {"plan": plan}
    if plan == "monthly":
        # Extend by 30 days from current expiry or now
        current_exp = user.get("plan_expires_at")
        if isinstance(current_exp, str):
            try:
                cur = datetime.fromisoformat(current_exp)
                if cur.tzinfo is None:
                    cur = cur.replace(tzinfo=timezone.utc)
            except Exception:
                cur = now
        else:
            cur = now
        base = cur if cur > now else now
        update["plan_expires_at"] = (base + timedelta(days=30)).isoformat()
    else:
        update["plan_expires_at"] = None  # lifetime → never expires

    await _db.app_users.update_one({"user_id": user["user_id"]}, {"$set": update})
    await _db.payments.insert_one({
        "user_id": user["user_id"],
        "order_id": order_id,
        "plan": plan,
        "amount": PLAN_LIFETIME_PRICE if plan == "lifetime" else PLAN_MONTHLY_PRICE,
        "status": "COMPLETED",
        "raw": data,
        "created_at": now.isoformat(),
    })
    user = await _db.app_users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"ok": True, "user": user, "subscription": _subscription_state(user)}
