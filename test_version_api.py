#!/usr/bin/env python3
"""
Test for Auto-update Blank White Screen Fix
Tests GET /api/ endpoint to verify it exposes the running version.

Bug Context:
After uploading an update, the desktop .exe detects it, but after installing,
the app shows a BLANK WHITE SCREEN.

Root Cause:
Race condition in frontend waitBackendReady(). The frozen exe schedules
os._exit(0) ~3000ms AFTER responding to /github/apply-update. The old
waitBackendReady waited only 1500ms then reloaded as soon as ANY ping
succeeded → it hit the OLD server (still alive, dying at 3s) and reloaded
the page during the exe-swap dead-zone → blank white screen.

Fix Applied:
1. GET /api/ now returns a `version` field (running/local version)
2. waitBackendReady(oldVersion, timeoutMs) rewritten to only return true
   when backend reports a version DIFFERENT from the old one (= new binary)
   OR after it has observed the server go DOWN and come back up.

This test verifies the backend API contract (GET /api/ returns version field).
"""

import requests
import sys
import json

# Backend URL from frontend/.env
BACKEND_URL = "https://711e942d-40ba-4d22-9aae-1331b6cecce5.preview.emergentagent.com/api"

# Expected version from /app/version.txt
EXPECTED_VERSION = "1.20.9"

# ANSI color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_header(text):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")


def print_pass(message):
    print(f"{GREEN}✓ PASS:{RESET} {message}")


def print_fail(message):
    print(f"{RED}✗ FAIL:{RESET} {message}")


def print_info(message):
    print(f"{YELLOW}ℹ INFO:{RESET} {message}")


def test_root_endpoint_version():
    """
    Test 1: GET /api/ must return version field
    
    Requirements:
    - HTTP 200 OK
    - JSON response
    - "message" field present with value "Event Reservation API"
    - "version" field present and non-empty
    - "version" field matches /app/version.txt (currently "1.20.9")
    """
    print_header("Test 1: GET /api/ - Version Field")
    
    endpoint = f"{BACKEND_URL}/"
    print_info(f"Testing: GET {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=10)
        print_info(f"Status code: {response.status_code}")
        
        # Check 1: HTTP 200
        if response.status_code != 200:
            print_fail(f"Expected HTTP 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        print_pass("HTTP 200 OK")
        
        # Check 2: JSON response
        try:
            data = response.json()
            print_pass("Response is valid JSON")
            print_info(f"Response body: {json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            print_info(f"Response text: {response.text[:500]}")
            return False
        
        all_passed = True
        
        # Check 3: "message" field present
        if "message" not in data:
            print_fail("Missing 'message' field in response")
            all_passed = False
        else:
            message = data.get("message", "")
            print_pass(f"'message' field present: '{message}'")
            
            # Check 4: message value is "Event Reservation API"
            if message == "Event Reservation API":
                print_pass("'message' field has correct value: 'Event Reservation API'")
            else:
                print_fail(f"'message' field has unexpected value: '{message}' (expected 'Event Reservation API')")
                all_passed = False
        
        # Check 5: "version" field present
        if "version" not in data:
            print_fail("❌ CRITICAL: Missing 'version' field in response")
            print_fail("The fix requires GET /api/ to return a 'version' field")
            all_passed = False
        else:
            version = data.get("version", "")
            print_pass(f"'version' field present: '{version}'")
            
            # Check 6: version is non-empty
            if not version or version.strip() == "":
                print_fail("❌ CRITICAL: 'version' field is empty")
                print_fail("The fix requires a non-empty version field")
                all_passed = False
            else:
                print_pass(f"'version' field is non-empty: '{version}'")
                
                # Check 7: version matches expected value
                if version == EXPECTED_VERSION:
                    print_pass(f"✅ 'version' field matches /app/version.txt: '{EXPECTED_VERSION}'")
                else:
                    print_fail(f"'version' field mismatch: got '{version}', expected '{EXPECTED_VERSION}'")
                    print_info("This may not be critical if version.txt was updated")
                    all_passed = False
        
        return all_passed
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 10 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_updates_check_regression():
    """
    Test 2: GET /api/updates/check - Regression check
    
    Verify this endpoint still works correctly (no regression from the fix).
    """
    print_header("Test 2: GET /api/updates/check - Regression Check")
    
    endpoint = f"{BACKEND_URL}/updates/check"
    print_info(f"Testing: GET {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=15)
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected HTTP 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        print_pass("HTTP 200 OK")
        
        try:
            data = response.json()
            print_pass("Response is valid JSON")
            print_info(f"Response keys: {list(data.keys())}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Basic validation - endpoint should return without errors
        print_pass("Endpoint responds correctly (no regression)")
        return True
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 15 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_github_check_updates_regression():
    """
    Test 3: GET /api/github/check-updates - Regression check
    
    Verify this endpoint still works correctly (no regression from the fix).
    """
    print_header("Test 3: GET /api/github/check-updates - Regression Check")
    
    endpoint = f"{BACKEND_URL}/github/check-updates"
    print_info(f"Testing: GET {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=20)
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected HTTP 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        print_pass("HTTP 200 OK")
        
        try:
            data = response.json()
            print_pass("Response is valid JSON")
            print_info(f"Response keys: {list(data.keys())}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Basic validation - endpoint should return without errors
        print_pass("Endpoint responds correctly (no regression)")
        return True
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 20 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_stats_regression():
    """
    Test 4: GET /api/stats - Regression check
    
    Verify this endpoint still works correctly (no regression from the fix).
    """
    print_header("Test 4: GET /api/stats - Regression Check")
    
    endpoint = f"{BACKEND_URL}/stats"
    print_info(f"Testing: GET {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=15)
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code != 200:
            print_fail(f"Expected HTTP 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        print_pass("HTTP 200 OK")
        
        try:
            data = response.json()
            print_pass("Response is valid JSON")
            print_info(f"Response keys: {list(data.keys())}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Basic validation - endpoint should return without errors
        print_pass("Endpoint responds correctly (no regression)")
        return True
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 15 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print_header("Auto-update Blank White Screen Fix - Backend API Tests")
    print_info(f"Backend URL: {BACKEND_URL}")
    print_info(f"Expected Version: {EXPECTED_VERSION}")
    
    results = {
        "Test 1: GET /api/ (version field)": test_root_endpoint_version(),
        "Test 2: GET /api/updates/check (regression)": test_updates_check_regression(),
        "Test 3: GET /api/github/check-updates (regression)": test_github_check_updates_regression(),
        "Test 4: GET /api/stats (regression)": test_stats_regression(),
    }
    
    # Print summary
    print_header("TEST SUMMARY")
    
    passed = 0
    failed = 0
    
    for test_name, result in results.items():
        if result:
            print(f"{GREEN}✓ PASS:{RESET} {test_name}")
            passed += 1
        else:
            print(f"{RED}✗ FAIL:{RESET} {test_name}")
            failed += 1
    
    print(f"\n{BLUE}Total: {passed + failed} tests{RESET}")
    print(f"{GREEN}Passed: {passed}{RESET}")
    print(f"{RED}Failed: {failed}{RESET}")
    
    if failed == 0:
        print(f"\n{GREEN}{'='*80}{RESET}")
        print(f"{GREEN}✅ ALL TESTS PASSED!{RESET}")
        print(f"{GREEN}The auto-update blank white screen fix is working correctly.{RESET}")
        print(f"{GREEN}GET /api/ now exposes the running version as required.{RESET}")
        print(f"{GREEN}{'='*80}{RESET}")
        return 0
    else:
        print(f"\n{RED}{'='*80}{RESET}")
        print(f"{RED}❌ SOME TESTS FAILED!{RESET}")
        print(f"{RED}The fix may not be complete or there are regressions.{RESET}")
        print(f"{RED}{'='*80}{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
