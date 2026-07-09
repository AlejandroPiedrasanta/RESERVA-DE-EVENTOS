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

# Admin password – matches SOPORTE_FACTORY_PASSWORD in DatabasePage.jsx
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "286811")

router = APIRouter(prefix="/api")


def _require_admin(x_admin_password: Optional[str]):
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(401, "Admin no autorizado")


# ── Models ────────────────────────────────────────────────────────────
class SessionExchangeReq(BaseModel):
    session_id: str


class OrderReq(BaseModel):
    plan: str  # "monthly" or "lifetime"


class RedeemReq(BaseModel):
    code: str


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
    if user and user.get("disabled"):
        return None
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
        if existing.get("disabled"):
            raise HTTPException(403, "Esta cuenta ha sido desactivada por el administrador")
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



# ── Referral Endpoints ────────────────────────────────────────────────
import secrets as _secrets
import string as _string


def _generate_referral_code() -> str:
    alphabet = _string.ascii_uppercase + _string.digits
    return "".join(_secrets.choice(alphabet) for _ in range(6))


async def _ensure_referral_code(user: dict) -> str:
    if user.get("referral_code"):
        return user["referral_code"]
    for _ in range(20):
        code = _generate_referral_code()
        existing = await _db.app_users.find_one({"referral_code": code}, {"_id": 0})
        if not existing:
            await _db.app_users.update_one(
                {"user_id": user["user_id"]}, {"$set": {"referral_code": code}}
            )
            return code
    raise HTTPException(500, "No se pudo generar el código de referido")


def _extend_monthly_plan(u: dict) -> Optional[dict]:
    """Return an $set update dict extending u's monthly plan by 30 days, or None if lifetime."""
    if u.get("plan") == "lifetime":
        return None
    now = datetime.now(timezone.utc)
    cur_exp = u.get("plan_expires_at")
    if isinstance(cur_exp, str):
        try:
            cur = datetime.fromisoformat(cur_exp)
            if cur.tzinfo is None:
                cur = cur.replace(tzinfo=timezone.utc)
        except Exception:
            cur = now
    else:
        cur = now
    base = cur if cur > now else now
    return {"plan": "monthly", "plan_expires_at": (base + timedelta(days=30)).isoformat()}


@router.get("/referral/me")
async def referral_me(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "No autenticado")
    code = await _ensure_referral_code(user)
    count = await _db.referrals.count_documents({"referrer_user_id": user["user_id"]})
    return {
        "code": code,
        "redeemed_count": count,
        "months_earned": count,
        "already_redeemed": bool(user.get("referred_by")),
    }


@router.post("/referral/redeem")
async def referral_redeem(
    body: RedeemReq,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "No autenticado")
    if user.get("referred_by"):
        raise HTTPException(400, "Ya canjeaste un código de referido")

    code = (body.code or "").strip().upper()
    if len(code) < 4:
        raise HTTPException(400, "Código inválido")

    referrer = await _db.app_users.find_one({"referral_code": code}, {"_id": 0})
    if not referrer:
        raise HTTPException(404, "Código no encontrado")
    if referrer["user_id"] == user["user_id"]:
        raise HTTPException(400, "No puedes canjear tu propio código")

    now = datetime.now(timezone.utc)

    # Extend referred user (the one redeeming)
    ru_upd = _extend_monthly_plan(user) or {}
    ru_upd["referred_by"] = referrer["user_id"]
    await _db.app_users.update_one({"user_id": user["user_id"]}, {"$set": ru_upd})

    # Extend referrer
    rf_upd = _extend_monthly_plan(referrer)
    if rf_upd:
        await _db.app_users.update_one({"user_id": referrer["user_id"]}, {"$set": rf_upd})

    await _db.referrals.insert_one({
        "referrer_user_id": referrer["user_id"],
        "referred_user_id": user["user_id"],
        "code": code,
        "created_at": now.isoformat(),
    })

    user = await _db.app_users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return {"ok": True, "user": user, "subscription": _subscription_state(user)}


# ── Admin Endpoints ────────────────────────────────────────────────────
@router.get("/admin/users")
async def admin_list_users(x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    _require_admin(x_admin_password)
    users = await _db.app_users.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    total_referrals_by_user = {}
    async for r in _db.referrals.aggregate([
        {"$group": {"_id": "$referrer_user_id", "n": {"$sum": 1}}}
    ]):
        total_referrals_by_user[r["_id"]] = r["n"]
    total_payments_by_user = {}
    async for p in _db.payments.aggregate([
        {"$match": {"status": "COMPLETED"}},
        {"$group": {"_id": "$user_id", "n": {"$sum": 1}, "amount": {"$sum": {"$toDouble": "$amount"}}}}
    ]):
        total_payments_by_user[p["_id"]] = {"count": p["n"], "amount": p["amount"]}

    enriched = []
    for u in users:
        sub = _subscription_state(u)
        u_out = dict(u)
        u_out["subscription"] = sub
        u_out["disabled"] = bool(u.get("disabled"))
        u_out["referrals_count"] = total_referrals_by_user.get(u["user_id"], 0)
        u_out["payments"] = total_payments_by_user.get(u["user_id"], {"count": 0, "amount": 0})
        enriched.append(u_out)
    return {"users": enriched, "total": len(enriched)}


@router.post("/admin/users/{user_id}/disable")
async def admin_disable_user(user_id: str, x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    _require_admin(x_admin_password)
    res = await _db.app_users.update_one({"user_id": user_id}, {"$set": {"disabled": True}})
    if res.matched_count == 0:
        raise HTTPException(404, "Usuario no encontrado")
    # Kill all active sessions
    await _db.user_sessions.delete_many({"user_id": user_id})
    return {"ok": True, "disabled": True}


@router.post("/admin/users/{user_id}/enable")
async def admin_enable_user(user_id: str, x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    _require_admin(x_admin_password)
    res = await _db.app_users.update_one({"user_id": user_id}, {"$set": {"disabled": False}})
    if res.matched_count == 0:
        raise HTTPException(404, "Usuario no encontrado")
    return {"ok": True, "disabled": False}


@router.post("/admin/users/{user_id}/revoke")
async def admin_revoke_plan(user_id: str, x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    """Clear the user's plan (removes paid subscription; trial remains as computed)."""
    _require_admin(x_admin_password)
    res = await _db.app_users.update_one(
        {"user_id": user_id},
        {"$set": {"plan": None, "plan_expires_at": None}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Usuario no encontrado")
    return {"ok": True, "plan": None}


class GrantPlanReq(BaseModel):
    plan: str  # "monthly" | "lifetime"
    months: Optional[int] = 1


@router.post("/admin/users/{user_id}/grant")
async def admin_grant_plan(
    user_id: str,
    body: GrantPlanReq,
    x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password"),
):
    _require_admin(x_admin_password)
    if body.plan not in ("monthly", "lifetime"):
        raise HTTPException(400, "Plan inválido")
    user = await _db.app_users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    now = datetime.now(timezone.utc)
    if body.plan == "lifetime":
        upd = {"plan": "lifetime", "plan_expires_at": None}
    else:
        cur_exp = user.get("plan_expires_at")
        if isinstance(cur_exp, str):
            try:
                cur = datetime.fromisoformat(cur_exp)
                if cur.tzinfo is None:
                    cur = cur.replace(tzinfo=timezone.utc)
            except Exception:
                cur = now
        else:
            cur = now
        base = cur if cur > now else now
        months = max(1, int(body.months or 1))
        upd = {"plan": "monthly", "plan_expires_at": (base + timedelta(days=30 * months)).isoformat()}
    await _db.app_users.update_one({"user_id": user_id}, {"$set": upd})
    return {"ok": True, **upd}


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    _require_admin(x_admin_password)
    res = await _db.app_users.delete_one({"user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Usuario no encontrado")
    await _db.user_sessions.delete_many({"user_id": user_id})
    return {"ok": True, "deleted": True}

