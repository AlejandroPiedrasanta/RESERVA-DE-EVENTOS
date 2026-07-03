"""
Regression tests after backend refactor (extracted desktop_package.py, ai_context_default.py)
+ 6 logic fixes (reminders, xlsx export, OAuth env urls).

Goal: verify NO endpoint returns unhandled 500 due to broken imports or bad logic.
"""
import os
import io
import json
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://event-reserve-31.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ---------- Health ----------
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json() == {"message": "Event Reservation API"}


# ---------- Reservations CRUD ----------
@pytest.fixture(scope="module")
def reservation_id(s):
    payload = {
        "client_name": "TEST_Regress_Client",
        "client_email": "test_regress@example.com",
        "event_type": "Boda",
        "event_date": (datetime.utcnow() + timedelta(days=15)).isoformat(),
        "total_amount": 1500.0,
        "advance_paid": 500.0,
    }
    r = s.post(f"{API}/reservations", json=payload)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert data.get("client_name") == "TEST_Regress_Client"
    assert "id" in data
    yield data["id"]
    s.delete(f"{API}/reservations/{data['id']}")


def test_reservations_list(s, reservation_id):
    r = s.get(f"{API}/reservations")
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert reservation_id in ids


def test_reservation_get(s, reservation_id):
    r = s.get(f"{API}/reservations/{reservation_id}")
    assert r.status_code == 200
    assert r.json()["id"] == reservation_id


def test_reservation_update(s, reservation_id):
    r = s.put(f"{API}/reservations/{reservation_id}", json={"total_amount": 1800.0})
    assert r.status_code == 200
    r2 = s.get(f"{API}/reservations/{reservation_id}")
    assert r2.json()["total_amount"] == 1800.0


# ---------- Stats / Financials / Calendar ----------
def test_stats(s):
    r = s.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    for k in ("total_reservations", "upcoming_events", "pending_payment", "real_income"):
        assert k in d


def test_financials(s):
    r = s.get(f"{API}/financials")
    assert r.status_code == 200


def test_calendar(s):
    r = s.get(f"{API}/calendar")
    assert r.status_code == 200


# ---------- Socios CRUD ----------
def test_socios_crud(s):
    payload = {"name": "TEST_Socio", "phone": "1234567890"}
    r = s.post(f"{API}/socios", json=payload)
    assert r.status_code in (200, 201), r.text
    sid = r.json()["id"]
    r = s.get(f"{API}/socios")
    assert r.status_code == 200
    r = s.put(f"{API}/socios/{sid}", json={"name": "TEST_Socio_Upd"})
    assert r.status_code == 200
    r = s.delete(f"{API}/socios/{sid}")
    assert r.status_code in (200, 204)


# ---------- Settings ----------
def test_settings_get_masks_secrets(s):
    r = s.get(f"{API}/settings")
    assert r.status_code == 200
    d = r.json()
    # MUST NEVER expose password hash
    # ensure the hash field is not present at all (avoid matching app_password_hint substring)
    assert "app_password_hash" not in d
    assert d.get("app_password_hash") is None


def test_settings_put(s):
    payload = {
        "reminder_periods": [7, 3, 1],
        "notify_client": True,
        "reminder_time": "09:00",
    }
    r = s.put(f"{API}/settings", json=payload)
    assert r.status_code == 200, r.text


# ---------- Database settings ----------
def test_settings_database(s):
    r = s.get(f"{API}/settings/database")
    assert r.status_code == 200


def test_settings_database_test_invalid(s):
    r = s.post(f"{API}/settings/database/test", json={"url": "mongodb://invalid-host-xyz:27017"})
    assert r.status_code in (400, 200)  # controlled error, not 500
    if r.status_code == 200:
        assert r.json().get("success") is False


# ---------- Reminders ----------
def test_notifications_pending(s):
    r = s.get(f"{API}/notifications/pending")
    assert r.status_code == 200


def test_reminders_send_no_keys(s):
    r = s.post(f"{API}/reminders/send", json={})
    # must be controlled (200 with result or 400), not unhandled 500
    assert r.status_code in (200, 400), r.text


def test_reminders_test_email_no_key(s):
    r = s.post(f"{API}/reminders/test-email", json={"to": "x@y.com"})
    assert r.status_code == 400, r.text


# ---------- Backup ----------
@pytest.fixture(scope="module")
def backup_id(s):
    r = s.post(f"{API}/backup/create", json={})
    assert r.status_code in (200, 201), r.text
    d = r.json()
    return d.get("id") or d.get("backup_id")


def test_backup_history(s, backup_id):
    r = s.get(f"{API}/backup/history")
    assert r.status_code == 200


def test_backup_download(s, backup_id):
    r = s.get(f"{API}/backup/download")
    assert r.status_code in (200, 404), r.text


def test_backup_restore_invalid(s):
    files = {"file": ("bad.json", io.BytesIO(b"not-json-at-all"), "application/json")}
    r = requests.post(f"{API}/backup/restore", files=files)
    assert r.status_code == 400, r.text


# ---------- Data cleanup / clear-all ----------
def test_data_cleanup_preview(s):
    r = s.post(f"{API}/data/cleanup?action=preview")
    assert r.status_code == 200, r.text


# NOTE: clear-all is destructive — do it LAST and re-seed if needed. Guard with query.
def test_data_clear_all_last(s):
    # Run only if explicitly enabled (destructive). We call preview-safe alternative:
    # Skip actual clear to preserve other running tests' data.
    pytest.skip("Skipping destructive clear-all to preserve DB state")


# ---------- Import/Export ----------
def test_export_csv(s):
    r = s.get(f"{API}/export/reservations?format=csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "") or "csv" in r.headers.get("content-type", "").lower()


def test_export_json(s):
    r = s.get(f"{API}/export/reservations?format=json")
    assert r.status_code == 200


def test_export_xlsx(s):
    r = s.get(f"{API}/export/reservations/xlsx")
    assert r.status_code == 200, r.text
    ct = r.headers.get("content-type", "")
    assert "spreadsheet" in ct or "xlsx" in ct or "octet-stream" in ct
    # File signature for xlsx (zip): PK
    assert r.content[:2] == b"PK", "xlsx content is not a valid zip/xlsx"


# ---------- Security ----------
def test_security_status(s):
    r = s.get(f"{API}/security/status")
    assert r.status_code == 200
    d = r.json()
    for k in ("password_enabled", "protection_enabled"):
        assert k in d


def test_security_set_verify_remove(s):
    # Check initial state; if already enabled skip modification to avoid clobbering
    st = s.get(f"{API}/security/status").json()
    if st.get("password_enabled"):
        pytest.skip("Password already set; skipping security set/remove test")
    r = s.post(f"{API}/security/set-password", json={"password": "test1234"})
    assert r.status_code == 200, r.text
    r = s.post(f"{API}/security/verify", json={"password": "test1234"})
    assert r.status_code == 200 and r.json().get("valid") is True
    r = s.post(f"{API}/security/verify", json={"password": "wrong"})
    assert r.status_code in (200, 401)
    if r.status_code == 200:
        assert r.json().get("valid") is False
    # too short (needs current_password since already set)
    r = s.post(f"{API}/security/set-password", json={"password": "ab", "current_password": "test1234"})
    assert r.status_code in (400, 422), r.text
    # remove — uses current_password
    r = s.post(f"{API}/security/remove-password", json={"current_password": "test1234"})
    assert r.status_code == 200, r.text


def test_security_advanced_config(s):
    r = s.put(f"{API}/security/advanced-config", json={"max_attempts": 5, "lockout_minutes": 15})
    assert r.status_code in (200, 400)


def test_security_protection_toggle(s):
    r = s.put(f"{API}/security/protection", json={"enabled": True})
    assert r.status_code == 200
    r = s.put(f"{API}/security/protection", json={"enabled": False})
    assert r.status_code == 200


# ---------- Themes ----------
@pytest.fixture(scope="module")
def theme_id(s):
    r = s.post(f"{API}/themes", json={"name": "TEST_Theme_Regr", "colors": {"primary": "#123456"}})
    assert r.status_code in (200, 201), r.text
    tid = r.json().get("id")
    yield tid
    s.delete(f"{API}/themes/{tid}")


def test_themes_list(s, theme_id):
    r = s.get(f"{API}/themes")
    assert r.status_code == 200


def test_themes_missing_name(s):
    r = s.post(f"{API}/themes", json={})
    assert r.status_code in (400, 422)


# ---------- Appearance ----------
def test_appearance_get_put(s):
    r = s.get(f"{API}/settings/appearance")
    assert r.status_code == 200
    r2 = s.put(f"{API}/settings/appearance", json=r.json() if isinstance(r.json(), dict) else {})
    assert r2.status_code in (200, 400)


# ---------- AI Context (new module) ----------
def test_ai_context_flow(s):
    r = s.get(f"{API}/ai-context")
    assert r.status_code == 200
    d = r.json()
    content = d.get("content") if isinstance(d, dict) else None
    assert content and len(content) > 500, "DEFAULT_AI_CONTEXT should be long"
    # save
    r = s.post(f"{API}/ai-context", json={"content": "TEST_AI_CTX_CUSTOM"})
    assert r.status_code == 200
    r2 = s.get(f"{API}/ai-context")
    assert "TEST_AI_CTX_CUSTOM" in r2.json().get("content", "")
    # reset
    r = s.post(f"{API}/ai-context/reset")
    assert r.status_code == 200
    r3 = s.get(f"{API}/ai-context")
    assert "TEST_AI_CTX_CUSTOM" not in r3.json().get("content", "")


# ---------- GitHub ----------
def test_github_config_get(s):
    r = s.get(f"{API}/github/config")
    assert r.status_code == 200
    assert "suggested_repo" in r.json()


def test_github_config_invalid_url(s):
    r = s.post(f"{API}/github/config", json={"repo_url": "not-a-url"})
    assert r.status_code == 400, r.text


# ---------- Updates ----------
def test_updates_history(s):
    r = s.get(f"{API}/updates/history")
    assert r.status_code == 200


def test_updates_latest(s):
    r = s.get(f"{API}/updates/latest")
    assert r.status_code in (200, 404)


def test_updates_check(s):
    r = s.get(f"{API}/updates/check")
    assert r.status_code == 200


# ---------- Push / Deployment ----------
def test_push_vapid(s):
    r = s.get(f"{API}/push/vapid-key")
    assert r.status_code in (200, 404)


def test_deployment_env_template(s):
    r = s.get(f"{API}/deployment/env-template")
    assert r.status_code == 200


def test_deployment_docker_compose(s):
    r = s.get(f"{API}/deployment/docker-compose")
    assert r.status_code == 200
