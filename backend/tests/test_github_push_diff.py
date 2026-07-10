"""Backend tests for GET /api/github/push-diff.

Covers:
- Schema of response (ok, changed, summary, by_category, files, truncated, remote_branch, cached)
- Real diff includes backend/server.py and at least one frontend/ file
- Cache: second call returns cached=true with same 'changed' count
- refresh=true forces recomputation (cached=false)
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
# Token de sesión QA: NO hardcodear en el fuente. Lee de env `QA_TEST_TOKEN`
# (definido en el runner CI / .env local). Si no existe, el test se marca skip.
QA_TOKEN = os.environ.get("QA_TEST_TOKEN", "")
if not QA_TOKEN:
    pytest.skip(
        "QA_TEST_TOKEN no configurado (export QA_TEST_TOKEN=<sess_token>)",
        allow_module_level=True,
    )

HEADERS = {"Authorization": f"Bearer {QA_TOKEN}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def initial_diff():
    """Force refresh to seed the cache with a known payload."""
    r = requests.get(
        f"{BASE_URL}/api/github/push-diff",
        params={"refresh": "true"},
        headers=HEADERS,
        timeout=200,
    )
    assert r.status_code == 200, f"push-diff refresh failed: {r.status_code} {r.text[:400]}"
    return r.json()


# ── Schema / structure ─────────────────────────────────────────────────────
def test_push_diff_top_level_schema(initial_diff):
    d = initial_diff
    assert d.get("ok") is True
    for key in ("changed", "summary", "by_category", "files", "truncated", "remote_branch", "cached"):
        assert key in d, f"missing key {key}"
    assert isinstance(d["changed"], int)
    assert isinstance(d["summary"], dict)
    for k in ("added", "modified", "deleted"):
        assert k in d["summary"] and isinstance(d["summary"][k], int)
    assert isinstance(d["files"], list)
    assert isinstance(d["by_category"], dict)
    assert d["remote_branch"], "remote_branch should not be empty"


def test_summary_matches_changed(initial_diff):
    s = initial_diff["summary"]
    assert initial_diff["changed"] == s["added"] + s["modified"] + s["deleted"]


def test_files_have_expected_fields(initial_diff):
    for f in initial_diff["files"]:
        for k in ("path", "status", "category", "size_bytes"):
            assert k in f, f"file missing {k}: {f}"
        assert f["status"] in ("A", "M", "D")


def test_by_category_totals_consistent(initial_diff):
    for cat, bc in initial_diff["by_category"].items():
        for k in ("added", "modified", "deleted", "total"):
            assert k in bc, f"by_category[{cat}] missing {k}"
        assert bc["total"] == bc["added"] + bc["modified"] + bc["deleted"]


def test_local_changes_reflected(initial_diff):
    """The local repo has diverged; server.py and at least one frontend file should differ."""
    paths = [f["path"] for f in initial_diff["files"]]
    assert initial_diff["changed"] > 0, "expected at least 1 changed file"
    assert any(p == "backend/server.py" for p in paths), f"backend/server.py not in diff: {paths}"
    assert any(p.startswith("frontend/") for p in paths), f"no frontend/ file in diff: {paths}"


# ── Cache behaviour ────────────────────────────────────────────────────────
def test_cache_hits_on_second_call(initial_diff):
    # Sleep briefly (< 90s TTL) then hit without refresh
    time.sleep(1)
    r = requests.get(f"{BASE_URL}/api/github/push-diff", headers=HEADERS, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d.get("cached") is True, "second call within 90s should be cached=true"
    assert d.get("changed") == initial_diff.get("changed"), "cached 'changed' must match"
    assert d.get("summary") == initial_diff.get("summary"), "cached summary must match"


def test_refresh_bypasses_cache():
    r = requests.get(
        f"{BASE_URL}/api/github/push-diff",
        params={"refresh": "true"},
        headers=HEADERS,
        timeout=200,
    )
    assert r.status_code == 200
    d = r.json()
    assert d.get("cached") is False, "refresh=true must return cached=false"


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-v"]))
