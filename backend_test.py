#!/usr/bin/env python3
"""
Backend API Test Suite for Version-Check Bug Fix
Tests the fix for GitHub version detection endpoints.
"""

import requests
import sys
import json
from typing import Dict, Any

# Backend URL from frontend/.env
BACKEND_URL = "https://evento-manager-16.preview.emergentagent.com/api"

# Expected values
EXPECTED_VERSION = "1.13"
EXPECTED_REPO = "AlejandroPiedrasanta/RESERVA-DE-EVENTOS"

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


def validate_response(response: requests.Response, endpoint: str) -> Dict[str, Any]:
    """Validate HTTP response and return JSON data."""
    print_info(f"Testing endpoint: {endpoint}")
    print_info(f"Status code: {response.status_code}")
    
    if response.status_code != 200:
        print_fail(f"Expected status 200, got {response.status_code}")
        print_info(f"Response text: {response.text[:500]}")
        return None
    
    print_pass(f"HTTP 200 OK")
    
    try:
        data = response.json()
        print_info(f"Response JSON:\n{json.dumps(data, indent=2)}")
        return data
    except Exception as e:
        print_fail(f"Failed to parse JSON: {e}")
        print_info(f"Response text: {response.text[:500]}")
        return None


def test_github_version_endpoint():
    """Test GET /api/updates/github-version?refresh=true"""
    print_test_header("Test 1: GET /api/updates/github-version?refresh=true")
    
    endpoint = f"{BACKEND_URL}/updates/github-version?refresh=true"
    
    try:
        response = requests.get(endpoint, timeout=15)
        data = validate_response(response, endpoint)
        
        if not data:
            return False
        
        # Validate required fields
        required_fields = ["github_version", "local_version", "has_update", "source_url"]
        all_passed = True
        
        for field in required_fields:
            if field not in data:
                print_fail(f"Missing required field: {field}")
                all_passed = False
        
        if not all_passed:
            return False
        
        # Validate github_version
        github_version = data.get("github_version", "")
        if github_version == EXPECTED_VERSION:
            print_pass(f"github_version = '{github_version}' (correct)")
        else:
            print_fail(f"github_version = '{github_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Check for old buggy version
        if github_version == "1.0.18":
            print_fail("BUG: Still returning old version 1.0.18 from version.txt!")
            all_passed = False
        
        # Check for spurious tags
        spurious_tags = ["2001.2", "ww", "g2"]
        for tag in spurious_tags:
            if tag in github_version:
                print_fail(f"BUG: Spurious tag detected in version: {github_version}")
                all_passed = False
        
        # Validate local_version
        local_version = data.get("local_version", "")
        if local_version == EXPECTED_VERSION:
            print_pass(f"local_version = '{local_version}' (correct)")
        else:
            print_fail(f"local_version = '{local_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Validate has_update
        has_update = data.get("has_update")
        if has_update is False:
            print_pass(f"has_update = {has_update} (correct)")
        else:
            print_fail(f"has_update = {has_update}, expected False")
            all_passed = False
        
        # Validate source_url
        source_url = data.get("source_url", "")
        if "v1.13" in source_url and EXPECTED_REPO in source_url:
            print_pass(f"source_url points to v1.13 tag: {source_url}")
        else:
            print_fail(f"source_url does not point to v1.13 tag: {source_url}")
            all_passed = False
        
        return all_passed
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 15 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_check_updates_endpoint_with_refresh():
    """Test GET /api/updates/check?refresh=true"""
    print_test_header("Test 2: GET /api/updates/check?refresh=true")
    
    endpoint = f"{BACKEND_URL}/updates/check?refresh=true"
    
    try:
        response = requests.get(endpoint, timeout=15)
        data = validate_response(response, endpoint)
        
        if not data:
            return False
        
        # Validate required fields
        required_fields = ["github_version", "local_version", "remote_version", "has_update"]
        all_passed = True
        
        for field in required_fields:
            if field not in data:
                print_fail(f"Missing required field: {field}")
                all_passed = False
        
        if not all_passed:
            return False
        
        # Validate github_version
        github_version = data.get("github_version", "")
        if github_version == EXPECTED_VERSION:
            print_pass(f"github_version = '{github_version}' (correct)")
        else:
            print_fail(f"github_version = '{github_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Validate local_version
        local_version = data.get("local_version", "")
        if local_version == EXPECTED_VERSION:
            print_pass(f"local_version = '{local_version}' (correct)")
        else:
            print_fail(f"local_version = '{local_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Validate remote_version
        remote_version = data.get("remote_version", "")
        if remote_version == EXPECTED_VERSION:
            print_pass(f"remote_version = '{remote_version}' (correct)")
        else:
            print_fail(f"remote_version = '{remote_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Validate has_update
        has_update = data.get("has_update")
        if has_update is False:
            print_pass(f"has_update = {has_update} (correct)")
        else:
            print_fail(f"has_update = {has_update}, expected False")
            all_passed = False
        
        return all_passed
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 15 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_check_updates_endpoint_cached():
    """Test GET /api/updates/check (no refresh, should use cache)"""
    print_test_header("Test 3: GET /api/updates/check (cached)")
    
    endpoint = f"{BACKEND_URL}/updates/check"
    
    try:
        response = requests.get(endpoint, timeout=15)
        data = validate_response(response, endpoint)
        
        if not data:
            return False
        
        # Same validations as test 2
        all_passed = True
        
        # Validate github_version
        github_version = data.get("github_version", "")
        if github_version == EXPECTED_VERSION:
            print_pass(f"github_version = '{github_version}' (correct, from cache)")
        else:
            print_fail(f"github_version = '{github_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Validate local_version
        local_version = data.get("local_version", "")
        if local_version == EXPECTED_VERSION:
            print_pass(f"local_version = '{local_version}' (correct)")
        else:
            print_fail(f"local_version = '{local_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Validate remote_version
        remote_version = data.get("remote_version", "")
        if remote_version == EXPECTED_VERSION:
            print_pass(f"remote_version = '{remote_version}' (correct)")
        else:
            print_fail(f"remote_version = '{remote_version}', expected '{EXPECTED_VERSION}'")
            all_passed = False
        
        # Validate has_update
        has_update = data.get("has_update")
        if has_update is False:
            print_pass(f"has_update = {has_update} (correct)")
        else:
            print_fail(f"has_update = {has_update}, expected False")
            all_passed = False
        
        return all_passed
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 15 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_sanity_check():
    """Test GET /api/ (sanity check)"""
    print_test_header("Test 4: GET /api/ (sanity check)")
    
    endpoint = f"{BACKEND_URL}/"
    
    try:
        response = requests.get(endpoint, timeout=10)
        print_info(f"Testing endpoint: {endpoint}")
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            print_pass("Backend is alive and responding")
            return True
        else:
            print_fail(f"Expected status 200, got {response.status_code}")
            return False
        
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        return False


def main():
    """Run all tests."""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Version-Check Bug Fix Test Suite{RESET}")
    print(f"{BLUE}Backend URL: {BACKEND_URL}{RESET}")
    print(f"{BLUE}Expected Version: {EXPECTED_VERSION}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    results = {
        "Test 1: /api/updates/github-version?refresh=true": test_github_version_endpoint(),
        "Test 2: /api/updates/check?refresh=true": test_check_updates_endpoint_with_refresh(),
        "Test 3: /api/updates/check (cached)": test_check_updates_endpoint_cached(),
        "Test 4: /api/ (sanity check)": test_sanity_check(),
    }
    
    # Print summary
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
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
        print(f"{GREEN}ALL TESTS PASSED! ✓{RESET}")
        print(f"{GREEN}{'='*80}{RESET}")
        return 0
    else:
        print(f"\n{RED}{'='*80}{RESET}")
        print(f"{RED}SOME TESTS FAILED! ✗{RESET}")
        print(f"{RED}{'='*80}{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
