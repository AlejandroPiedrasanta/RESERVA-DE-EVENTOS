#!/usr/bin/env python3
"""
Backend API Test Suite - Google Sign-In Configuration Endpoints
Tests for the new Google Sign-In tab in Database page (Soporte avanzado).

Tests:
A) GET /api/auth/google-config (public, no password)
B) GET /api/admin/google-login/config (admin, correct password)
C) GET /api/admin/google-login/config (admin, wrong password)
D) PATCH /api/admin/google-login/config (save client_id)
E) PATCH /api/admin/google-login/config (save client_secret)
F) PATCH /api/admin/google-login/config (empty body)
G) GET /api/auth/google-config (verify persistence after D)
"""

import requests
import sys
import json
from typing import Dict, Any

# Backend URL from frontend/.env
BACKEND_URL = "https://09c6054c-9916-4e39-9f61-f009cd5e5fc7.preview.emergentagent.com/api"

# Admin password (SOPORTE_FACTORY_PASSWORD)
ADMIN_PASSWORD = "286811"
WRONG_PASSWORD = "wrong_password"

# Test data
TEST_CLIENT_ID = "test-fake-id-12345.apps.googleusercontent.com"
TEST_CLIENT_SECRET = "GOCSPX-test-secret-fake"

# ANSI color codes for output
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


def print_section(message: str):
    """Print a section header."""
    print(f"\n{BLUE}{message}{RESET}")


def test_a_public_google_config():
    """
    TEST A: GET /api/auth/google-config (public endpoint, no password)
    Should return 200 with structure {client_id: string, configured: boolean}
    Never returns client_secret.
    """
    print_test_header("A) Public Endpoint - GET /api/auth/google-config")
    
    try:
        url = f"{BACKEND_URL}/auth/google-config"
        print_info(f"GET {url}")
        
        response = requests.get(url, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check status code
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
        
        print_pass("Status code is 200")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Check required fields
        if "client_id" not in data:
            print_fail("Missing 'client_id' field")
            return False
        print_pass("'client_id' field present")
        
        if "configured" not in data:
            print_fail("Missing 'configured' field")
            return False
        print_pass("'configured' field present")
        
        # Check types
        if not isinstance(data["client_id"], str):
            print_fail(f"'client_id' should be string, got {type(data['client_id'])}")
            return False
        print_pass("'client_id' is string")
        
        if not isinstance(data["configured"], bool):
            print_fail(f"'configured' should be boolean, got {type(data['configured'])}")
            return False
        print_pass("'configured' is boolean")
        
        # Ensure client_secret is NOT exposed
        if "client_secret" in data:
            print_fail("SECURITY ISSUE: 'client_secret' should NEVER be exposed in public endpoint")
            return False
        print_pass("'client_secret' is NOT exposed (security check passed)")
        
        print_section(f"{GREEN}✓ TEST A PASSED{RESET}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False


def test_b_admin_get_correct_password():
    """
    TEST B: GET /api/admin/google-login/config (admin endpoint with correct password)
    Should return 200 with structure {client_id, client_secret_masked, has_client_secret, configured}
    client_secret_masked should be masked with "•" characters.
    """
    print_test_header("B) Admin GET - Correct Password")
    
    try:
        url = f"{BACKEND_URL}/admin/google-login/config"
        headers = {"X-Admin-Password": ADMIN_PASSWORD}
        print_info(f"GET {url}")
        print_info(f"Headers: X-Admin-Password: {ADMIN_PASSWORD}")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check status code
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
        
        print_pass("Status code is 200")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Check required fields
        required_fields = ["client_id", "client_secret_masked", "has_client_secret", "configured"]
        for field in required_fields:
            if field not in data:
                print_fail(f"Missing '{field}' field")
                return False
            print_pass(f"'{field}' field present")
        
        # Check types
        if not isinstance(data["client_id"], str):
            print_fail(f"'client_id' should be string, got {type(data['client_id'])}")
            return False
        print_pass("'client_id' is string")
        
        if not isinstance(data["client_secret_masked"], str):
            print_fail(f"'client_secret_masked' should be string, got {type(data['client_secret_masked'])}")
            return False
        print_pass("'client_secret_masked' is string")
        
        if not isinstance(data["has_client_secret"], bool):
            print_fail(f"'has_client_secret' should be boolean, got {type(data['has_client_secret'])}")
            return False
        print_pass("'has_client_secret' is boolean")
        
        if not isinstance(data["configured"], bool):
            print_fail(f"'configured' should be boolean, got {type(data['configured'])}")
            return False
        print_pass("'configured' is boolean")
        
        # Check that client_secret_masked is actually masked (contains "•")
        if data["has_client_secret"] and "•" not in data["client_secret_masked"]:
            print_fail(f"'client_secret_masked' should contain '•' characters for masking, got: {data['client_secret_masked']}")
            return False
        if data["has_client_secret"]:
            print_pass(f"'client_secret_masked' is properly masked: {data['client_secret_masked']}")
        
        print_section(f"{GREEN}✓ TEST B PASSED{RESET}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False


def test_c_admin_get_wrong_password():
    """
    TEST C: GET /api/admin/google-login/config (admin endpoint with wrong password)
    Should return 401 or 403 (not 200, not 500).
    """
    print_test_header("C) Admin GET - Wrong Password")
    
    try:
        url = f"{BACKEND_URL}/admin/google-login/config"
        headers = {"X-Admin-Password": WRONG_PASSWORD}
        print_info(f"GET {url}")
        print_info(f"Headers: X-Admin-Password: {WRONG_PASSWORD}")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check status code - should be 401 or 403
        if response.status_code not in [401, 403]:
            print_fail(f"Expected status 401 or 403, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
        
        print_pass(f"Status code is {response.status_code} (unauthorized, as expected)")
        
        # Should NOT return 200 (success)
        if response.status_code == 200:
            print_fail("SECURITY ISSUE: Wrong password should NOT return 200")
            return False
        
        # Should NOT return 500 (server error)
        if response.status_code == 500:
            print_fail("Wrong password should return 401/403, not 500 (server error)")
            return False
        
        print_section(f"{GREEN}✓ TEST C PASSED{RESET}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False


def test_d_admin_patch_client_id():
    """
    TEST D: PATCH /api/admin/google-login/config (save client_id)
    Should return 200 with {ok: true, client_id: "...", configured: true}
    Then verify persistence with GET.
    """
    print_test_header("D) Admin PATCH - Save client_id")
    
    try:
        url = f"{BACKEND_URL}/admin/google-login/config"
        headers = {
            "X-Admin-Password": ADMIN_PASSWORD,
            "Content-Type": "application/json"
        }
        payload = {"client_id": TEST_CLIENT_ID}
        
        print_info(f"PATCH {url}")
        print_info(f"Headers: X-Admin-Password: {ADMIN_PASSWORD}")
        print_info(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.patch(url, headers=headers, json=payload, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check status code
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
        
        print_pass("Status code is 200")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Check required fields
        if "ok" not in data:
            print_fail("Missing 'ok' field")
            return False
        print_pass("'ok' field present")
        
        if data["ok"] != True:
            print_fail(f"Expected 'ok' to be true, got {data['ok']}")
            return False
        print_pass("'ok' is true")
        
        if "client_id" not in data:
            print_fail("Missing 'client_id' field")
            return False
        print_pass("'client_id' field present")
        
        if data["client_id"] != TEST_CLIENT_ID:
            print_fail(f"Expected client_id '{TEST_CLIENT_ID}', got '{data['client_id']}'")
            return False
        print_pass(f"'client_id' matches: {TEST_CLIENT_ID}")
        
        if "configured" not in data:
            print_fail("Missing 'configured' field")
            return False
        print_pass("'configured' field present")
        
        if data["configured"] != True:
            print_fail(f"Expected 'configured' to be true, got {data['configured']}")
            return False
        print_pass("'configured' is true")
        
        # Verify persistence with GET
        print_section("Verifying persistence with GET /api/admin/google-login/config")
        get_url = f"{BACKEND_URL}/admin/google-login/config"
        get_headers = {"X-Admin-Password": ADMIN_PASSWORD}
        get_response = requests.get(get_url, headers=get_headers, timeout=10)
        
        if get_response.status_code != 200:
            print_fail(f"GET request failed with status {get_response.status_code}")
            return False
        
        get_data = get_response.json()
        print_info(f"GET Response: {json.dumps(get_data, indent=2)}")
        
        if get_data.get("client_id") != TEST_CLIENT_ID:
            print_fail(f"Persistence check failed: expected client_id '{TEST_CLIENT_ID}', got '{get_data.get('client_id')}'")
            return False
        print_pass(f"Persistence verified: client_id is '{TEST_CLIENT_ID}'")
        
        print_section(f"{GREEN}✓ TEST D PASSED{RESET}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False


def test_e_admin_patch_client_secret():
    """
    TEST E: PATCH /api/admin/google-login/config (save client_secret)
    Should return 200 with {ok: true, ...}
    Then verify with GET that has_client_secret is true and client_secret_masked ends with last 4 chars.
    """
    print_test_header("E) Admin PATCH - Save client_secret")
    
    try:
        url = f"{BACKEND_URL}/admin/google-login/config"
        headers = {
            "X-Admin-Password": ADMIN_PASSWORD,
            "Content-Type": "application/json"
        }
        payload = {"client_secret": TEST_CLIENT_SECRET}
        
        print_info(f"PATCH {url}")
        print_info(f"Headers: X-Admin-Password: {ADMIN_PASSWORD}")
        print_info(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.patch(url, headers=headers, json=payload, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check status code
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
        
        print_pass("Status code is 200")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Check 'ok' field
        if "ok" not in data or data["ok"] != True:
            print_fail(f"Expected 'ok' to be true, got {data.get('ok')}")
            return False
        print_pass("'ok' is true")
        
        # Verify persistence with GET
        print_section("Verifying persistence with GET /api/admin/google-login/config")
        get_url = f"{BACKEND_URL}/admin/google-login/config"
        get_headers = {"X-Admin-Password": ADMIN_PASSWORD}
        get_response = requests.get(get_url, headers=get_headers, timeout=10)
        
        if get_response.status_code != 200:
            print_fail(f"GET request failed with status {get_response.status_code}")
            return False
        
        get_data = get_response.json()
        print_info(f"GET Response: {json.dumps(get_data, indent=2)}")
        
        # Check has_client_secret is true
        if not get_data.get("has_client_secret"):
            print_fail("Expected 'has_client_secret' to be true after saving secret")
            return False
        print_pass("'has_client_secret' is true")
        
        # Check client_secret_masked ends with last 4 chars of TEST_CLIENT_SECRET
        expected_suffix = TEST_CLIENT_SECRET[-4:]  # "fake"
        masked = get_data.get("client_secret_masked", "")
        
        if not masked.endswith(expected_suffix):
            print_fail(f"Expected 'client_secret_masked' to end with '{expected_suffix}', got '{masked}'")
            return False
        print_pass(f"'client_secret_masked' ends with '{expected_suffix}': {masked}")
        
        # Check that it's actually masked (contains "•")
        if "•" not in masked:
            print_fail(f"'client_secret_masked' should contain '•' characters, got: {masked}")
            return False
        print_pass(f"'client_secret_masked' is properly masked with '•' characters")
        
        print_section(f"{GREEN}✓ TEST E PASSED{RESET}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False


def test_f_admin_patch_empty_body():
    """
    TEST F: PATCH /api/admin/google-login/config (empty body)
    Should return 400 with detail "Nada que actualizar" (not 500).
    """
    print_test_header("F) Admin PATCH - Empty Body")
    
    try:
        url = f"{BACKEND_URL}/admin/google-login/config"
        headers = {
            "X-Admin-Password": ADMIN_PASSWORD,
            "Content-Type": "application/json"
        }
        payload = {}
        
        print_info(f"PATCH {url}")
        print_info(f"Headers: X-Admin-Password: {ADMIN_PASSWORD}")
        print_info(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.patch(url, headers=headers, json=payload, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check status code - should be 400
        if response.status_code != 400:
            print_fail(f"Expected status 400, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
        
        print_pass("Status code is 400 (bad request, as expected)")
        
        # Should NOT return 500 (server error)
        if response.status_code == 500:
            print_fail("Empty body should return 400, not 500 (server error)")
            return False
        
        # Parse JSON and check detail message
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            detail = data.get("detail", "")
            if "Nada que actualizar" not in detail:
                print_fail(f"Expected detail message 'Nada que actualizar', got '{detail}'")
                return False
            print_pass(f"Detail message is correct: '{detail}'")
            
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        print_section(f"{GREEN}✓ TEST F PASSED{RESET}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False


def test_g_public_endpoint_reflects_saved_data():
    """
    TEST G: GET /api/auth/google-config (verify public endpoint reflects saved data)
    After saving client_id in test D, the public endpoint should return configured=true
    and the same client_id.
    """
    print_test_header("G) Public Endpoint - Verify Saved Data")
    
    try:
        url = f"{BACKEND_URL}/auth/google-config"
        print_info(f"GET {url}")
        
        response = requests.get(url, timeout=10)
        
        print_info(f"Status Code: {response.status_code}")
        
        # Check status code
        if response.status_code != 200:
            print_fail(f"Expected status 200, got {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
        
        print_pass("Status code is 200")
        
        # Parse JSON
        try:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        # Check configured is true
        if not data.get("configured"):
            print_fail(f"Expected 'configured' to be true after saving client_id, got {data.get('configured')}")
            return False
        print_pass("'configured' is true")
        
        # Check client_id matches what we saved in test D
        if data.get("client_id") != TEST_CLIENT_ID:
            print_fail(f"Expected client_id '{TEST_CLIENT_ID}', got '{data.get('client_id')}'")
            return False
        print_pass(f"'client_id' matches saved value: {TEST_CLIENT_ID}")
        
        print_section(f"{GREEN}✓ TEST G PASSED{RESET}")
        return True
        
    except Exception as e:
        print_fail(f"Exception: {e}")
        return False


def main():
    """Run all tests."""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Google Sign-In Configuration Endpoints - Backend Test Suite{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    print_info(f"Backend URL: {BACKEND_URL}")
    print_info(f"Admin Password: {ADMIN_PASSWORD}")
    print_info(f"Test Client ID: {TEST_CLIENT_ID}")
    print_info(f"Test Client Secret: {TEST_CLIENT_SECRET}")
    
    tests = [
        ("A) Public Endpoint (no password)", test_a_public_google_config),
        ("B) Admin GET (correct password)", test_b_admin_get_correct_password),
        ("C) Admin GET (wrong password)", test_c_admin_get_wrong_password),
        ("D) Admin PATCH (save client_id)", test_d_admin_patch_client_id),
        ("E) Admin PATCH (save client_secret)", test_e_admin_patch_client_secret),
        ("F) Admin PATCH (empty body)", test_f_admin_patch_empty_body),
        ("G) Public Endpoint (verify persistence)", test_g_public_endpoint_reflects_saved_data),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print_fail(f"Test '{test_name}' raised exception: {e}")
            results.append((test_name, False))
    
    # Print summary
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{GREEN}✓ PASSED{RESET}" if result else f"{RED}✗ FAILED{RESET}"
        print(f"{status} - {test_name}")
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{RESET}")
    
    if passed == total:
        print(f"{GREEN}{'='*80}{RESET}")
        print(f"{GREEN}ALL TESTS PASSED ✓{RESET}")
        print(f"{GREEN}{'='*80}{RESET}")
        return 0
    else:
        print(f"{RED}{'='*80}{RESET}")
        print(f"{RED}SOME TESTS FAILED ✗{RESET}")
        print(f"{RED}{'='*80}{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
