#!/usr/bin/env python3
"""
Test suite for auto-update endpoints after Inno Setup fix in standalone_app.py
Tests all update-related endpoints to ensure NO regressions in cloud backend (server.py)
"""
import requests
import json
import sys

# Read backend URL from frontend/.env
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip()
            break

API_URL = f"{BASE_URL}/api"

print(f"Testing backend at: {API_URL}")
print("=" * 80)

def test_endpoint(name, method, endpoint, expected_status=200, expected_fields=None, checks=None):
    """Generic test function for endpoints"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print(f"{'='*80}")
    
    url = f"{API_URL}{endpoint}"
    print(f"URL: {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=30)
        elif method == "POST":
            response = requests.post(url, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        print(f"Status: {response.status_code}")
        
        # Check status code
        if response.status_code != expected_status:
            print(f"❌ FAILED: Expected {expected_status}, got {response.status_code}")
            print(f"Response: {response.text[:500]}")
            return False
        
        # Parse JSON
        try:
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
        except Exception as e:
            print(f"❌ FAILED: Could not parse JSON: {e}")
            print(f"Response: {response.text[:500]}")
            return False
        
        # Check expected fields
        if expected_fields:
            missing = [f for f in expected_fields if f not in data]
            if missing:
                print(f"❌ FAILED: Missing fields: {missing}")
                return False
            print(f"✅ All expected fields present: {expected_fields}")
        
        # Run custom checks
        if checks:
            for check_name, check_func in checks.items():
                try:
                    result = check_func(data)
                    if result:
                        print(f"✅ {check_name}: PASS")
                    else:
                        print(f"❌ {check_name}: FAIL")
                        return False
                except Exception as e:
                    print(f"❌ {check_name}: ERROR - {e}")
                    return False
        
        # Print key values
        print("\nKey values:")
        for key in ['version', 'local_version', 'github_version', 'remote_version', 
                    'has_update', 'has_updates', 'is_cloud', 'status', 'name', 'size', 
                    'url', 'sha256', 'checked', 'manifest_available', 'remote_source']:
            if key in data:
                val = data[key]
                if isinstance(val, str) and len(val) > 100:
                    val = val[:100] + "..."
                print(f"  {key}: {val}")
        
        print(f"\n✅ TEST PASSED: {name}")
        return True
        
    except requests.exceptions.Timeout:
        print(f"❌ FAILED: Request timeout after 30s")
        return False
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


# Test suite
results = {}

# Test 1: GET /api/
results['root'] = test_endpoint(
    "GET /api/ - Root endpoint",
    "GET",
    "/",
    expected_fields=["message", "version"],
    checks={
        "Version is 1.20.30": lambda d: d.get("version") == "1.20.30",
        "Message contains 'Event Reservation API'": lambda d: "Event Reservation API" in d.get("message", "")
    }
)

# Test 2: GET /api/updates/check
results['updates_check'] = test_endpoint(
    "GET /api/updates/check - Main update check endpoint",
    "GET",
    "/updates/check",
    expected_fields=["checked", "has_update", "is_cloud", "local_version", 
                     "github_version", "remote_version", "remote_source", "manifest_available"],
    checks={
        "local_version is 1.20.30": lambda d: d.get("local_version") == "1.20.30",
        "is_cloud is True": lambda d: d.get("is_cloud") == True,
        "checked is True": lambda d: d.get("checked") == True,
        "has_update is bool": lambda d: isinstance(d.get("has_update"), bool),
        "No 500 error": lambda d: True  # If we got here, no 500
    }
)

# Test 3: GET /api/updates/manifest
results['updates_manifest'] = test_endpoint(
    "GET /api/updates/manifest - Update manifest endpoint",
    "GET",
    "/updates/manifest",
    expected_fields=["status"],
    checks={
        "Status is 'not_available' or 'ready'": lambda d: d.get("status") in ["not_available", "ready"]
    }
)

# Test 4: GET /api/download/desktop-installer/info
results['desktop_installer_info'] = test_endpoint(
    "GET /api/download/desktop-installer/info - Installer info",
    "GET",
    "/download/desktop-installer/info",
    expected_fields=["status", "name", "size", "url", "sha256"],
    checks={
        "Status is 'ready'": lambda d: d.get("status") == "ready",
        "Name is CinemaProductions-Setup.exe": lambda d: d.get("name") == "CinemaProductions-Setup.exe",
        "Size > 0": lambda d: d.get("size", 0) > 0,
        "URL not empty": lambda d: len(d.get("url", "")) > 0,
        "URL points to github releases": lambda d: "github.com" in d.get("url", "") and "releases" in d.get("url", ""),
        "SHA256 is 64 hex chars": lambda d: len(d.get("sha256", "")) == 64 and all(c in "0123456789abcdef" for c in d.get("sha256", "").lower())
    }
)

# Test 5: GET /api/download/desktop-exe/info
results['desktop_exe_info'] = test_endpoint(
    "GET /api/download/desktop-exe/info - Portable exe info",
    "GET",
    "/download/desktop-exe/info",
    expected_fields=["status", "name", "size"],
    checks={
        "Status is 'ready'": lambda d: d.get("status") == "ready",
        "Name is CinemaProductions.exe (portable, no 'setup')": lambda d: d.get("name") == "CinemaProductions.exe" and "setup" not in d.get("name", "").lower(),
        "Size > 0": lambda d: d.get("size", 0) > 0
    }
)

# Test 6: GET /api/updates/github-version
results['github_version'] = test_endpoint(
    "GET /api/updates/github-version - GitHub version check",
    "GET",
    "/updates/github-version",
    expected_fields=["local_version", "github_version"],
    checks={
        "local_version present": lambda d: len(d.get("local_version", "")) > 0,
        "github_version present": lambda d: len(d.get("github_version", "")) > 0
    }
)

# Summary
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)

passed = sum(1 for v in results.values() if v)
total = len(results)

for test_name, result in results.items():
    status = "✅ PASS" if result else "❌ FAIL"
    print(f"{status}: {test_name}")

print(f"\nTotal: {passed}/{total} tests passed")

if passed == total:
    print("\n🎉 ALL TESTS PASSED - No regressions in update endpoints!")
    sys.exit(0)
else:
    print(f"\n⚠️  {total - passed} test(s) failed")
    sys.exit(1)
