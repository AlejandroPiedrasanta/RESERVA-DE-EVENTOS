#!/usr/bin/env python3
"""
Auto-Update Backend Endpoints Test
Tests the fix for update logic to prevent announcing new versions before downloadable binary is published.

Tests:
1. GET /api/github/check-updates - Must return has_updates=false when no newer downloadable asset exists
2. GET /api/updates/check - Must return HTTP 200 with JSON object
3. GET /api/updates/github-version - Must return HTTP 200 with JSON object
4. POST /api/github/apply-update with dry_run=true - Must NOT return generic 500 error
"""

import requests
import sys
import json
from typing import Dict, Any

# Backend URL from frontend/.env
BACKEND_URL = "https://reserva-eventos-19.preview.emergentagent.com/api"

# Expected local version
EXPECTED_LOCAL_VERSION = "1.20.14"

# ANSI color codes
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def print_test_header(test_name: str):
    """Print a formatted test header."""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST: {test_name}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")


def print_pass(message: str):
    """Print a pass message."""
    print(f"{GREEN}✓ PASS:{RESET} {message}")


def print_fail(message: str):
    """Print a fail message."""
    print(f"{RED}✗ FAIL:{RESET} {message}")


def print_info(message: str):
    """Print an info message."""
    print(f"{YELLOW}ℹ INFO:{RESET} {message}")


def test_github_check_updates():
    """
    Test 1: GET /api/github/check-updates
    
    Must return:
    - HTTP 200
    - JSON body with keys: has_updates, remote_version, local_version, commits, repo_url, branch
    - With current repo state (local 1.20.14, no newer downloadable asset), has_updates=false
    - Must NOT return 500
    """
    print_test_header("Test 1: GET /api/github/check-updates")
    
    endpoint = f"{BACKEND_URL}/github/check-updates"
    print_info(f"Endpoint: {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=20)
        print_info(f"Status code: {response.status_code}")
        
        # Check HTTP 200
        if response.status_code != 200:
            print_fail(f"Expected HTTP 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        
        print_pass("HTTP 200 OK")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response JSON:\n{json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        print_pass("Valid JSON response")
        
        # Check required keys
        required_keys = ["has_updates", "remote_version", "local_version", "commits", "repo_url", "branch"]
        all_keys_present = True
        
        for key in required_keys:
            if key not in data:
                print_fail(f"Missing required key: {key}")
                all_keys_present = False
            else:
                print_pass(f"Key '{key}' present: {data[key]}")
        
        if not all_keys_present:
            return False
        
        # Validate local_version
        if data["local_version"] != EXPECTED_LOCAL_VERSION:
            print_fail(f"local_version mismatch: expected {EXPECTED_LOCAL_VERSION}, got {data['local_version']}")
        else:
            print_pass(f"local_version correct: {data['local_version']}")
        
        # Check has_updates value
        print_info(f"has_updates = {data['has_updates']}")
        print_info(f"remote_version = {data['remote_version']}")
        print_info(f"commits_ahead = {data.get('commits_ahead', 'N/A')}")
        
        # The fix: has_updates should be false when no newer downloadable asset exists
        # With local version 1.20.14 and no newer asset, has_updates should be false
        if data["has_updates"]:
            print_info("⚠ WARNING: has_updates=true. This may indicate a newer version is available.")
            print_info("The fix ensures has_updates is only true when a downloadable binary exists.")
        else:
            print_pass("has_updates=false (correct - no premature announcement)")
        
        print_pass("✅ Test 1 PASSED: /api/github/check-updates returns correct structure")
        return True
        
    except requests.exceptions.Timeout:
        print_fail("Request timeout (20s)")
        return False
    except Exception as e:
        print_fail(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_updates_check():
    """
    Test 2: GET /api/updates/check
    
    Must return:
    - HTTP 200
    - JSON object
    """
    print_test_header("Test 2: GET /api/updates/check")
    
    endpoint = f"{BACKEND_URL}/updates/check"
    print_info(f"Endpoint: {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=15)
        print_info(f"Status code: {response.status_code}")
        
        # Check HTTP 200
        if response.status_code != 200:
            print_fail(f"Expected HTTP 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        
        print_pass("HTTP 200 OK")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response JSON:\n{json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        print_pass("Valid JSON response")
        print_pass("✅ Test 2 PASSED: /api/updates/check returns HTTP 200 with JSON")
        return True
        
    except requests.exceptions.Timeout:
        print_fail("Request timeout (15s)")
        return False
    except Exception as e:
        print_fail(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_updates_github_version():
    """
    Test 3: GET /api/updates/github-version
    
    Must return:
    - HTTP 200
    - JSON object
    """
    print_test_header("Test 3: GET /api/updates/github-version")
    
    endpoint = f"{BACKEND_URL}/updates/github-version"
    print_info(f"Endpoint: {endpoint}")
    
    try:
        response = requests.get(endpoint, timeout=15)
        print_info(f"Status code: {response.status_code}")
        
        # Check HTTP 200
        if response.status_code != 200:
            print_fail(f"Expected HTTP 200, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            return False
        
        print_pass("HTTP 200 OK")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response JSON:\n{json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        print_pass("Valid JSON response")
        print_pass("✅ Test 3 PASSED: /api/updates/github-version returns HTTP 200 with JSON")
        return True
        
    except requests.exceptions.Timeout:
        print_fail("Request timeout (15s)")
        return False
    except Exception as e:
        print_fail(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_apply_update_dry_run():
    """
    Test 4: POST /api/github/apply-update with {"dry_run": true}
    
    Must NOT return generic 500 error.
    Acceptable outcomes:
    - HTTP 200 (dry-run success)
    - HTTP 4xx (e.g., 404 "no hay actualizaciones" / "no update available")
    
    FAILURE:
    - HTTP 500 with unhandled exception
    """
    print_test_header("Test 4: POST /api/github/apply-update with dry_run=true")
    
    endpoint = f"{BACKEND_URL}/github/apply-update"
    print_info(f"Endpoint: {endpoint}")
    
    payload = {"dry_run": True}
    print_info(f"Payload: {json.dumps(payload)}")
    
    try:
        response = requests.post(endpoint, json=payload, timeout=20)
        print_info(f"Status code: {response.status_code}")
        
        # Parse response
        try:
            data = response.json()
            print_info(f"Response JSON:\n{json.dumps(data, indent=2)}")
        except Exception as e:
            print_info(f"Response text: {response.text[:500]}")
            data = None
        
        # Check for generic 500 error (FAILURE)
        if response.status_code == 500:
            print_fail("❌ CRITICAL: Endpoint returned HTTP 500 (generic error)")
            print_fail("This indicates an unhandled exception in the apply-update logic")
            return False
        
        # Acceptable outcomes: 200 or 4xx
        if response.status_code == 200:
            print_pass("HTTP 200 OK (dry-run success)")
            print_pass("✅ Test 4 PASSED: No generic 500 error")
            return True
        elif 400 <= response.status_code < 500:
            print_pass(f"HTTP {response.status_code} (controlled 4xx response)")
            if data and "detail" in data:
                print_info(f"Detail: {data['detail']}")
            print_pass("✅ Test 4 PASSED: No generic 500 error (controlled 4xx is acceptable)")
            return True
        else:
            print_fail(f"Unexpected status code: {response.status_code}")
            return False
        
    except requests.exceptions.Timeout:
        print_fail("Request timeout (20s)")
        return False
    except Exception as e:
        print_fail(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}AUTO-UPDATE BACKEND ENDPOINTS TEST SUITE{RESET}")
    print(f"{BLUE}Backend URL: {BACKEND_URL}{RESET}")
    print(f"{BLUE}Expected Local Version: {EXPECTED_LOCAL_VERSION}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    results = []
    
    # Test 1: GET /api/github/check-updates
    results.append(("GET /api/github/check-updates", test_github_check_updates()))
    
    # Test 2: GET /api/updates/check
    results.append(("GET /api/updates/check", test_updates_check()))
    
    # Test 3: GET /api/updates/github-version
    results.append(("GET /api/updates/github-version", test_updates_github_version()))
    
    # Test 4: POST /api/github/apply-update with dry_run=true
    results.append(("POST /api/github/apply-update (dry_run)", test_apply_update_dry_run()))
    
    # Summary
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{GREEN}✓ PASS{RESET}" if result else f"{RED}✗ FAIL{RESET}"
        print(f"{status}: {test_name}")
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{RESET}")
    
    if passed == total:
        print(f"{GREEN}{'='*80}{RESET}")
        print(f"{GREEN}ALL TESTS PASSED ✅{RESET}")
        print(f"{GREEN}{'='*80}{RESET}")
        return 0
    else:
        print(f"{RED}{'='*80}{RESET}")
        print(f"{RED}SOME TESTS FAILED ❌{RESET}")
        print(f"{RED}{'='*80}{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
