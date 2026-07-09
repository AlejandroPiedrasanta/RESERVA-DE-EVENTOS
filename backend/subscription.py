"""
Subscription + Auth (Google OAuth + PayPal) module.
- 3-day trial per user (from first login)
- $1/month subscription OR $20 lifetime via PayPal
- Session cookie based auth
Mounted on the main FastAPI app as an additional router.
"""
from __future__ import annotations
import os
import re
import uuid
import hashlib
import secrets as _secrets_mod
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response, Cookie, Header
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
from google.oauth2 import id_token as _google_id_token
from google.auth.transport import requests as _google_requests


# ── Password helpers (PBKDF2-HMAC-SHA256) ────────────────────────────
def _hash_password(password: str) -> str:
    salt = _secrets_mod.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200_000)
    return f"pbkdf2_sha256$200000${salt.hex()}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iters)
        )
        return _secrets_mod.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False

# ── DB ────────────────────────────────────────────────────────────────
_MONGO_URL = os.environ["MONGO_URL"]
_DB_NAME = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(_MONGO_URL)
_db = _client[_DB_NAME]

# ── Constants ─────────────────────────────────────────────────────────
TRIAL_DAYS = 3
GOOGLE_LOGIN_CLIENT_ID_ENV = os.environ.get("GOOGLE_LOGIN_CLIENT_ID", "")
GOOGLE_LOGIN_CLIENT_SECRET_ENV = os.environ.get("GOOGLE_LOGIN_CLIENT_SECRET", "")


async def _get_google_login_settings() -> dict:
    """Read Google Sign-In credentials from DB (preferred) or env fallback."""
    doc = await _db.app_settings.find_one({"_id": "google_login"}, {"_id": 0}) or {}
    return {
        "client_id": (doc.get("client_id") or GOOGLE_LOGIN_CLIENT_ID_ENV or "").strip(),
        "client_secret": (doc.get("client_secret") or GOOGLE_LOGIN_CLIENT_SECRET_ENV or "").strip(),
    }

PAYPAL_MODE = os.environ.get("PAYPAL_MODE", "sandbox")
PAYPAL_BASE = "https://api-m.sandbox.paypal.com" if PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"
PAYPAL_CLIENT_ID = os.environ.get("PAYPAL_CLIENT_ID", "")
PAYPAL_SECRET = os.environ.get("PAYPAL_SECRET", "")


async def _get_paypal_settings() -> dict:
    """Read PayPal credentials from DB (preferred) or fall back to environment."""
    doc = await _db.app_settings.find_one({"_id": "paypal"}, {"_id": 0}) or {}
    client_id = doc.get("client_id") or PAYPAL_CLIENT_ID or ""
    secret = doc.get("secret") or PAYPAL_SECRET or ""
    mode = doc.get("mode") or PAYPAL_MODE or "sandbox"
    base = "https://api-m.sandbox.paypal.com" if mode == "sandbox" else "https://api-m.paypal.com"
    return {"client_id": client_id, "secret": secret, "mode": mode, "base": base}

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
    credential: str  # Google ID token (JWT) obtained by @react-oauth/google on the frontend


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = ""


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateReq(BaseModel):
    name: Optional[str] = None
    picture: Optional[str] = None


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
    user = await _db.app_users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password_hash": 0})
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
    cfg = await _get_paypal_settings()
    if not cfg["client_id"] or not cfg["secret"]:
        raise HTTPException(500, "PayPal no configurado. Configúralo desde Base de datos → Soporte avanzado → PayPal")
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(
            f"{cfg['base']}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(cfg["client_id"], cfg["secret"]),
            headers={"Accept": "application/json"},
        )
        if r.status_code != 200:
            raise HTTPException(500, f"PayPal auth error: {r.text}")
        return r.json()["access_token"]


# ── Auth Endpoints ────────────────────────────────────────────────────
@router.post("/auth/session")
async def auth_session(body: SessionExchangeReq, response: Response):
    """Verify Google ID token → session_token cookie, create/update user, start trial."""
    google_cfg = await _get_google_login_settings()
    client_id = google_cfg["client_id"]
    if not client_id:
        raise HTTPException(500, "GOOGLE_LOGIN_CLIENT_ID no configurado. Ve a Base de datos → Soporte avanzado → Google Sign-In y guarda tu Client ID.")
    try:
        # Verify signature + audience against our Google OAuth Client ID
        idinfo = _google_id_token.verify_oauth2_token(
            body.credential,
            _google_requests.Request(),
            client_id,
        )
    except ValueError as e:
        raise HTTPException(401, f"Token de Google inválido: {e}")

    iss = idinfo.get("iss")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(401, "Emisor de token inválido")
    if not idinfo.get("email_verified", False):
        raise HTTPException(401, "Correo de Google no verificado")

    email = idinfo["email"].lower().strip()
    name = idinfo.get("name", "") or ""
    picture = idinfo.get("picture", "") or ""
    session_token = _secrets_mod.token_urlsafe(48)

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
            "auth_provider": "google",
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
    user = await _db.app_users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
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


# ── Email + Password Auth ─────────────────────────────────────────────
async def _create_session_for_user(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    session_token = _secrets_mod.token_urlsafe(48)
    await _db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (now + timedelta(days=30)).isoformat(),
        "created_at": now.isoformat(),
    })
    return session_token


@router.post("/auth/register")
async def auth_register(body: RegisterReq):
    email = body.email.lower().strip()
    if len(body.password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres")
    existing = await _db.app_users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(400, "Ya existe una cuenta con este correo. Inicia sesión.")
    now = datetime.now(timezone.utc)
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await _db.app_users.insert_one({
        "user_id": user_id,
        "email": email,
        "name": (body.name or "").strip() or email.split("@")[0],
        "picture": "",
        "password_hash": _hash_password(body.password),
        "auth_provider": "password",
        "trial_start_at": now.isoformat(),
        "plan": None,
        "plan_expires_at": None,
        "created_at": now.isoformat(),
        "last_login_at": now.isoformat(),
    })
    session_token = await _create_session_for_user(user_id)
    user = await _db.app_users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    return {"user": user, "subscription": _subscription_state(user), "session_token": session_token}


@router.post("/auth/login")
async def auth_login(body: LoginReq):
    email = body.email.lower().strip()
    user = await _db.app_users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        raise HTTPException(401, "Credenciales inválidas")
    if not _verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Credenciales inválidas")
    if user.get("disabled"):
        raise HTTPException(403, "Esta cuenta ha sido desactivada")
    now = datetime.now(timezone.utc)
    await _db.app_users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"last_login_at": now.isoformat()}}
    )
    session_token = await _create_session_for_user(user["user_id"])
    user = await _db.app_users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"user": user, "subscription": _subscription_state(user), "session_token": session_token}


@router.patch("/auth/profile")
async def auth_update_profile(
    body: ProfileUpdateReq,
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
):
    token = _extract_token(session_token, authorization)
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "No autenticado")
    upd = {}
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(400, "El nombre no puede estar vacío")
        if len(name) > 80:
            raise HTTPException(400, "El nombre es demasiado largo (máx 80 caracteres)")
        upd["name"] = name
    if body.picture is not None:
        # Accept only http(s) URLs or data URLs up to a modest limit
        pic = body.picture.strip()
        if pic and not re.match(r"^(https?://|data:image/)", pic):
            raise HTTPException(400, "URL de imagen inválida")
        upd["picture"] = pic
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    await _db.app_users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    user = await _db.app_users.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return {"ok": True, "user": user, "subscription": _subscription_state(user)}


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
    cfg = await _get_paypal_settings()
    return {
        "client_id": cfg["client_id"],
        "mode": cfg["mode"],
        "configured": bool(cfg["client_id"] and cfg["secret"]),
        "plans": {
            "monthly": {"price": PLAN_MONTHLY_PRICE, "currency": "USD", "label": "Mensual"},
            "lifetime": {"price": PLAN_LIFETIME_PRICE, "currency": "USD", "label": "Para siempre"},
        },
    }


class PaypalCredsReq(BaseModel):
    client_id: Optional[str] = None
    secret: Optional[str] = None
    mode: Optional[str] = None  # "sandbox" | "live"


@router.get("/admin/paypal/config")
async def admin_paypal_config(x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    _require_admin(x_admin_password)
    cfg = await _get_paypal_settings()
    # Mask secret for display
    secret = cfg["secret"] or ""
    masked = ("•" * 20 + secret[-4:]) if len(secret) > 4 else ("•" * len(secret))
    return {
        "client_id": cfg["client_id"],
        "secret_masked": masked,
        "has_secret": bool(secret),
        "mode": cfg["mode"],
        "configured": bool(cfg["client_id"] and cfg["secret"]),
    }


@router.patch("/admin/paypal/config")
async def admin_paypal_config_update(
    body: PaypalCredsReq,
    x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password"),
):
    _require_admin(x_admin_password)
    upd = {}
    if body.client_id is not None:
        upd["client_id"] = body.client_id.strip()
    if body.secret is not None and body.secret.strip():
        upd["secret"] = body.secret.strip()
    if body.mode is not None:
        if body.mode not in ("sandbox", "live"):
            raise HTTPException(400, "Modo inválido — usa 'sandbox' o 'live'")
        upd["mode"] = body.mode
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _db.app_settings.update_one({"_id": "paypal"}, {"$set": upd}, upsert=True)
    cfg = await _get_paypal_settings()
    return {
        "ok": True,
        "client_id": cfg["client_id"],
        "mode": cfg["mode"],
        "configured": bool(cfg["client_id"] and cfg["secret"]),
    }


@router.post("/admin/paypal/test")
async def admin_paypal_test(x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    """Verify PayPal credentials by requesting an access token."""
    _require_admin(x_admin_password)
    try:
        tok = await _paypal_access_token()
        return {"ok": True, "message": "Credenciales válidas ✓", "token_preview": tok[:12] + "..."}
    except HTTPException as e:
        return {"ok": False, "error": e.detail}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Google Sign-In credentials (admin config) ─────────────────────────
class GoogleLoginCredsReq(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None


@router.get("/auth/google-config")
async def auth_google_config():
    """Public endpoint: exposes ONLY the Google Sign-In client_id so the frontend
    can render the Google button. Never returns the client secret."""
    cfg = await _get_google_login_settings()
    return {"client_id": cfg["client_id"], "configured": bool(cfg["client_id"])}


@router.get("/admin/google-login/config")
async def admin_google_login_config(x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password")):
    _require_admin(x_admin_password)
    cfg = await _get_google_login_settings()
    secret = cfg["client_secret"] or ""
    masked = ("•" * 20 + secret[-4:]) if len(secret) > 4 else ("•" * len(secret))
    return {
        "client_id": cfg["client_id"],
        "client_secret_masked": masked,
        "has_client_secret": bool(secret),
        "configured": bool(cfg["client_id"]),
    }


@router.patch("/admin/google-login/config")
async def admin_google_login_config_update(
    body: GoogleLoginCredsReq,
    x_admin_password: Optional[str] = Header(default=None, alias="X-Admin-Password"),
):
    _require_admin(x_admin_password)
    upd = {}
    if body.client_id is not None:
        upd["client_id"] = body.client_id.strip()
    if body.client_secret is not None and body.client_secret.strip():
        upd["client_secret"] = body.client_secret.strip()
    if not upd:
        raise HTTPException(400, "Nada que actualizar")
    upd["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _db.app_settings.update_one({"_id": "google_login"}, {"$set": upd}, upsert=True)
    cfg = await _get_google_login_settings()
    return {
        "ok": True,
        "client_id": cfg["client_id"],
        "configured": bool(cfg["client_id"]),
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
    cfg = await _get_paypal_settings()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{cfg['base']}/v2/checkout/orders",
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
    cfg = await _get_paypal_settings()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{cfg['base']}/v2/checkout/orders/{order_id}/capture",
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

