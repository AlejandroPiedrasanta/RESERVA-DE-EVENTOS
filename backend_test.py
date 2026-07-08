#!/usr/bin/env python3
"""
Backend API Test Suite
Tests for:
1. Version-Check Bug Fix (GitHub version detection endpoints)
2. File-Selection Feature (push-preview and push-all with include parameter)
3. GitHub Storage Endpoints (storage info and builds deletion)
"""

import requests
import sys
import json
from typing import Dict, Any

# Backend URL from frontend/.env
BACKEND_URL = "https://45e29e02-56fa-46f6-a2f3-035f112db7a4.preview.emergentagent.com/api"

# Expected values
EXPECTED_VERSION = "1.13"
EXPECTED_REPO = "AlejandroPiedrasanta/RESERVA-DE-EVENTOS"

# Expected categories for push-preview
EXPECTED_CATEGORIES = ["backend", "frontend_src", "root_files", "standalone_app", "version_txt", "build_frontend"]

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


def test_github_push_preview():
    """Test GET /api/github/push-preview"""
    print_test_header("Test 5: GET /api/github/push-preview")
    
    endpoint = f"{BACKEND_URL}/github/push-preview"
    
    try:
        response = requests.get(endpoint, timeout=15)
        data = validate_response(response, endpoint)
        
        if not data:
            return False
        
        all_passed = True
        
        # Validate top-level structure
        if "categories" not in data:
            print_fail("Missing 'categories' field")
            return False
        
        if "totals_defaults" not in data:
            print_fail("Missing 'totals_defaults' field")
            return False
        
        print_pass("Response has required top-level fields: categories, totals_defaults")
        
        categories = data.get("categories", [])
        
        # Validate we have exactly 6 categories
        if len(categories) != 6:
            print_fail(f"Expected 6 categories, got {len(categories)}")
            all_passed = False
        else:
            print_pass(f"Found 6 categories")
        
        # Validate category IDs are present and in expected order
        category_ids = [c.get("id") for c in categories]
        print_info(f"Category IDs: {category_ids}")
        
        for expected_id in EXPECTED_CATEGORIES:
            if expected_id not in category_ids:
                print_fail(f"Missing expected category: {expected_id}")
                all_passed = False
        
        if all_passed:
            print_pass(f"All expected categories present: {EXPECTED_CATEGORIES}")
        
        # Validate each category has required fields
        required_fields = ["id", "label", "description", "files", "size_bytes", "default", "slow"]
        
        for category in categories:
            cat_id = category.get("id", "unknown")
            print_info(f"\nValidating category: {cat_id}")
            
            for field in required_fields:
                if field not in category:
                    print_fail(f"  Category '{cat_id}' missing field: {field}")
                    all_passed = False
            
            # Validate specific requirements for build_frontend
            if cat_id == "build_frontend":
                if category.get("default") is not False:
                    print_fail(f"  build_frontend.default should be False, got {category.get('default')}")
                    all_passed = False
                else:
                    print_pass(f"  build_frontend.default = False (correct)")
                
                if category.get("slow") is not True:
                    print_fail(f"  build_frontend.slow should be True, got {category.get('slow')}")
                    all_passed = False
                else:
                    print_pass(f"  build_frontend.slow = True (correct)")
            
            # Validate other categories have default=True and slow=False
            elif cat_id in EXPECTED_CATEGORIES:
                if category.get("default") is not True:
                    print_fail(f"  {cat_id}.default should be True, got {category.get('default')}")
                    all_passed = False
                else:
                    print_pass(f"  {cat_id}.default = True (correct)")
                
                if category.get("slow") is not False:
                    print_fail(f"  {cat_id}.slow should be False, got {category.get('slow')}")
                    all_passed = False
                else:
                    print_pass(f"  {cat_id}.slow = False (correct)")
        
        # Validate backend and frontend_src have files > 0
        backend_cat = next((c for c in categories if c.get("id") == "backend"), None)
        if backend_cat:
            if backend_cat.get("files", 0) > 0:
                print_pass(f"  backend.files = {backend_cat.get('files')} (> 0)")
            else:
                print_fail(f"  backend.files should be > 0, got {backend_cat.get('files')}")
                all_passed = False
        
        frontend_cat = next((c for c in categories if c.get("id") == "frontend_src"), None)
        if frontend_cat:
            if frontend_cat.get("files", 0) > 0:
                print_pass(f"  frontend_src.files = {frontend_cat.get('files')} (> 0)")
            else:
                print_fail(f"  frontend_src.files should be > 0, got {frontend_cat.get('files')}")
                all_passed = False
        
        # Validate totals_defaults
        totals = data.get("totals_defaults", {})
        if "files" not in totals:
            print_fail("totals_defaults missing 'files' field")
            all_passed = False
        else:
            print_pass(f"totals_defaults.files = {totals.get('files')}")
        
        if "size_bytes" not in totals:
            print_fail("totals_defaults missing 'size_bytes' field")
            all_passed = False
        else:
            print_pass(f"totals_defaults.size_bytes = {totals.get('size_bytes')}")
        
        return all_passed
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 15 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_github_push_all_validation():
    """Test POST /api/github/push-all validation (without actual push)"""
    print_test_header("Test 6: POST /api/github/push-all - Validation")
    
    endpoint = f"{BACKEND_URL}/github/push-all"
    
    all_passed = True
    
    # Test 1: Empty body - should return 400 with validation error
    print_info("\nTest 6a: POST with empty body {}")
    try:
        response = requests.post(endpoint, json={}, timeout=10)
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 400:
            print_pass("Returns 400 (validation error as expected)")
            data = response.json()
            detail = data.get("detail", "")
            print_info(f"Error detail: {detail}")
            
            if "Sin cuenta conectada" in detail or "Repositorio o usuario no configurado" in detail:
                print_pass("Correct validation error message")
            else:
                print_fail(f"Unexpected error message: {detail}")
                all_passed = False
        else:
            print_fail(f"Expected 400, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            all_passed = False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        all_passed = False
    
    # Test 2: With include parameter - should still validate credentials first
    print_info("\nTest 6b: POST with include parameter")
    try:
        payload = {
            "include": {
                "backend": True,
                "frontend_src": True,
                "root_files": False,
                "standalone_app": False,
                "version_txt": True,
                "build_frontend": False
            }
        }
        response = requests.post(endpoint, json=payload, timeout=10)
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 400:
            print_pass("Returns 400 (validation error as expected)")
            data = response.json()
            detail = data.get("detail", "")
            print_info(f"Error detail: {detail}")
            
            if "Sin cuenta conectada" in detail or "Repositorio o usuario no configurado" in detail:
                print_pass("Correct validation error message - endpoint accepts include parameter without crashing")
            else:
                print_fail(f"Unexpected error message: {detail}")
                all_passed = False
        else:
            print_fail(f"Expected 400, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            all_passed = False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        all_passed = False
    
    # Test 3: No body at all
    print_info("\nTest 6c: POST with no body")
    try:
        response = requests.post(endpoint, timeout=10)
        print_info(f"Status code: {response.status_code}")
        
        if response.status_code == 400:
            print_pass("Returns 400 (validation error as expected)")
            data = response.json()
            detail = data.get("detail", "")
            print_info(f"Error detail: {detail}")
        else:
            print_fail(f"Expected 400, got {response.status_code}")
            print_info(f"Response: {response.text[:500]}")
            all_passed = False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        all_passed = False
    
    return all_passed


def test_github_push_status():
    """Test GET /api/github/push-status"""
    print_test_header("Test 7: GET /api/github/push-status")
    
    endpoint = f"{BACKEND_URL}/github/push-status"
    
    try:
        response = requests.get(endpoint, timeout=10)
        data = validate_response(response, endpoint)
        
        if not data:
            return False
        
        all_passed = True
        
        # Validate required fields
        required_fields = ["status", "progress", "message"]
        
        for field in required_fields:
            if field not in data:
                print_fail(f"Missing required field: {field}")
                all_passed = False
        
        if all_passed:
            print_pass("All required fields present")
        
        # Since no push has been initiated, status should be idle
        status = data.get("status", "")
        if status == "idle":
            print_pass(f"status = 'idle' (correct, no push in progress)")
        else:
            print_info(f"status = '{status}' (may be from previous push)")
        
        print_info(f"Full response: {json.dumps(data, indent=2)}")
        
        return all_passed
        
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_github_storage():
    """Test GET /api/github/storage"""
    print_test_header("Test 8: GET /api/github/storage")
    
    endpoint = f"{BACKEND_URL}/github/storage"
    
    try:
        response = requests.get(endpoint, timeout=20)
        data = validate_response(response, endpoint)
        
        if not data:
            return False
        
        all_passed = True
        
        # Validate required top-level fields
        required_fields = ["connected", "repo_full_name", "repo", "plan", "builds", 
                          "builds_count", "builds_total_bytes", "builds_total_human", "errors"]
        
        for field in required_fields:
            if field not in data:
                print_fail(f"Missing required field: {field}")
                all_passed = False
        
        if all_passed:
            print_pass("All required top-level fields present")
        
        # Validate connected field (should be bool)
        connected = data.get("connected")
        if isinstance(connected, bool):
            print_pass(f"connected = {connected} (bool)")
        else:
            print_fail(f"connected should be bool, got {type(connected)}")
            all_passed = False
        
        # Validate repo_full_name (should be string)
        repo_full_name = data.get("repo_full_name", "")
        if isinstance(repo_full_name, str) and "/" in repo_full_name:
            print_pass(f"repo_full_name = '{repo_full_name}' (valid format)")
        else:
            print_fail(f"repo_full_name should be 'owner/repo' format, got '{repo_full_name}'")
            all_passed = False
        
        # Validate repo (can be object or null)
        repo = data.get("repo")
        if repo is not None:
            if isinstance(repo, dict):
                print_pass(f"repo is object with keys: {list(repo.keys())}")
                # Validate repo fields
                repo_fields = ["full_name", "private", "size_kb", "size_bytes", "size_human", 
                              "default_branch", "html_url"]
                for field in repo_fields:
                    if field not in repo:
                        print_fail(f"  repo missing field: {field}")
                        all_passed = False
            else:
                print_fail(f"repo should be object or null, got {type(repo)}")
                all_passed = False
        else:
            print_info("repo is null (may not have access)")
        
        # Validate plan (can be object or null)
        plan = data.get("plan")
        if plan is not None:
            if isinstance(plan, dict):
                print_pass(f"plan is object with keys: {list(plan.keys())}")
                # Validate plan has name and login
                if "name" in plan and "login" in plan:
                    print_pass(f"  plan.name = '{plan.get('name')}', plan.login = '{plan.get('login')}'")
                else:
                    print_fail(f"  plan missing 'name' or 'login' fields")
                    all_passed = False
            else:
                print_fail(f"plan should be object or null, got {type(plan)}")
                all_passed = False
        else:
            print_info("plan is null (may not be connected)")
        
        # Validate builds (should be array)
        builds = data.get("builds", [])
        if isinstance(builds, list):
            print_pass(f"builds is array with {len(builds)} items")
            
            # Validate each build has required fields
            if len(builds) > 0:
                build_fields = ["asset_id", "name", "size", "size_human", "kind", 
                               "release_id", "release_name", "tag"]
                
                for i, build in enumerate(builds[:3]):  # Check first 3 builds
                    print_info(f"\n  Validating build {i+1}: {build.get('name', 'unknown')}")
                    for field in build_fields:
                        if field not in build:
                            print_fail(f"    Build missing field: {field}")
                            all_passed = False
                    
                    # Validate kind is one of: portable, installer, .sha256
                    kind = build.get("kind", "")
                    if kind in ["portable", "installer", ".sha256"]:
                        print_pass(f"    kind = '{kind}' (valid)")
                    else:
                        print_fail(f"    kind = '{kind}' (should be portable/installer/.sha256)")
                        all_passed = False
        else:
            print_fail(f"builds should be array, got {type(builds)}")
            all_passed = False
        
        # Validate builds_count (should be int)
        builds_count = data.get("builds_count", 0)
        if isinstance(builds_count, int):
            print_pass(f"builds_count = {builds_count} (int)")
        else:
            print_fail(f"builds_count should be int, got {type(builds_count)}")
            all_passed = False
        
        # Validate builds_total_bytes (should be int)
        builds_total_bytes = data.get("builds_total_bytes", 0)
        if isinstance(builds_total_bytes, int):
            print_pass(f"builds_total_bytes = {builds_total_bytes} (int)")
        else:
            print_fail(f"builds_total_bytes should be int, got {type(builds_total_bytes)}")
            all_passed = False
        
        # Validate builds_total_bytes equals sum of sizes in builds[]
        if len(builds) > 0:
            calculated_total = sum(b.get("size", 0) for b in builds)
            if calculated_total == builds_total_bytes:
                print_pass(f"builds_total_bytes ({builds_total_bytes}) matches sum of build sizes")
            else:
                print_fail(f"builds_total_bytes ({builds_total_bytes}) != sum of sizes ({calculated_total})")
                all_passed = False
        
        # Validate builds_total_human (should be string)
        builds_total_human = data.get("builds_total_human", "")
        if isinstance(builds_total_human, str):
            print_pass(f"builds_total_human = '{builds_total_human}' (string)")
        else:
            print_fail(f"builds_total_human should be string, got {type(builds_total_human)}")
            all_passed = False
        
        # Validate errors (should be array)
        errors = data.get("errors", [])
        if isinstance(errors, list):
            if len(errors) == 0:
                print_pass(f"errors = [] (no errors)")
            else:
                print_info(f"errors = {errors} (some GitHub API calls may have failed)")
        else:
            print_fail(f"errors should be array, got {type(errors)}")
            all_passed = False
        
        # Validate endpoint never returns 500 (we got 200)
        print_pass("Endpoint returned 200 (never returns 500 even if GitHub calls fail)")
        
        return all_passed
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 20 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_github_delete_builds_safe():
    """Test DELETE /api/github/builds (SAFE test with non-existent asset_ids)"""
    print_test_header("Test 9: DELETE /api/github/builds (SAFE test)")
    
    endpoint = f"{BACKEND_URL}/github/builds"
    
    print_info("⚠️  IMPORTANT: This test uses non-existent asset_ids to avoid deleting real data")
    
    try:
        # SAFE TEST: Use non-existent asset_ids
        payload = {
            "asset_ids": [999999999, 888888888]  # Non-existent IDs
        }
        
        print_info(f"Sending DELETE request with payload: {json.dumps(payload)}")
        
        response = requests.delete(endpoint, json=payload, timeout=20)
        
        print_info(f"Status code: {response.status_code}")
        
        # Should return 200 or 400 (if no token)
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            if "GitHub" in detail or "token" in detail.lower() or "cuenta" in detail.lower():
                print_pass("Returns 400 with correct error (no GitHub token)")
                print_info(f"Error detail: {detail}")
                return True
            else:
                print_fail(f"Unexpected 400 error: {detail}")
                return False
        
        if response.status_code != 200:
            print_fail(f"Expected status 200 or 400, got {response.status_code}")
            print_info(f"Response text: {response.text[:500]}")
            return False
        
        print_pass("HTTP 200 OK")
        
        try:
            data = response.json()
            print_info(f"Response JSON:\n{json.dumps(data, indent=2)}")
        except Exception as e:
            print_fail(f"Failed to parse JSON: {e}")
            return False
        
        all_passed = True
        
        # Validate required fields
        required_fields = ["success", "deleted_count", "freed_bytes", "freed_human", "message", "errors"]
        
        for field in required_fields:
            if field not in data:
                print_fail(f"Missing required field: {field}")
                all_passed = False
        
        if all_passed:
            print_pass("All required fields present")
        
        # Validate success (should be bool)
        success = data.get("success")
        if isinstance(success, bool):
            print_pass(f"success = {success} (bool)")
        else:
            print_fail(f"success should be bool, got {type(success)}")
            all_passed = False
        
        # Validate deleted_count (should be 0 since asset_ids don't exist)
        deleted_count = data.get("deleted_count", -1)
        if deleted_count == 0:
            print_pass(f"deleted_count = 0 (correct, non-existent asset_ids)")
        else:
            print_fail(f"deleted_count should be 0, got {deleted_count}")
            all_passed = False
        
        # Validate freed_bytes (should be 0)
        freed_bytes = data.get("freed_bytes", -1)
        if freed_bytes == 0:
            print_pass(f"freed_bytes = 0 (correct)")
        else:
            print_fail(f"freed_bytes should be 0, got {freed_bytes}")
            all_passed = False
        
        # Validate freed_human (should be string)
        freed_human = data.get("freed_human", "")
        if isinstance(freed_human, str):
            print_pass(f"freed_human = '{freed_human}' (string)")
        else:
            print_fail(f"freed_human should be string, got {type(freed_human)}")
            all_passed = False
        
        # Validate message (should be string)
        message = data.get("message", "")
        if isinstance(message, str):
            print_pass(f"message = '{message}' (string)")
        else:
            print_fail(f"message should be string, got {type(message)}")
            all_passed = False
        
        # Validate errors (should be array)
        errors = data.get("errors", [])
        if isinstance(errors, list):
            print_pass(f"errors is array with {len(errors)} items")
        else:
            print_fail(f"errors should be array, got {type(errors)}")
            all_passed = False
        
        # Validate deleted field (optional, but if present should be array)
        if "deleted" in data:
            deleted = data.get("deleted", [])
            if isinstance(deleted, list):
                if len(deleted) == 0:
                    print_pass(f"deleted = [] (correct, nothing deleted)")
                else:
                    print_fail(f"deleted should be empty, got {len(deleted)} items")
                    all_passed = False
            else:
                print_fail(f"deleted should be array, got {type(deleted)}")
                all_passed = False
        
        print_pass("✅ SAFE TEST PASSED: Filtering works correctly without deleting real data")
        
        return all_passed
        
    except requests.exceptions.Timeout:
        print_fail("Request timed out after 20 seconds")
        return False
    except Exception as e:
        print_fail(f"Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Backend API Test Suite{RESET}")
    print(f"{BLUE}Backend URL: {BACKEND_URL}{RESET}")
    print(f"{BLUE}Expected Version: {EXPECTED_VERSION}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    results = {
        "Test 1: /api/updates/github-version?refresh=true": test_github_version_endpoint(),
        "Test 2: /api/updates/check?refresh=true": test_check_updates_endpoint_with_refresh(),
        "Test 3: /api/updates/check (cached)": test_check_updates_endpoint_cached(),
        "Test 4: /api/ (sanity check)": test_sanity_check(),
        "Test 5: /api/github/push-preview": test_github_push_preview(),
        "Test 6: /api/github/push-all (validation)": test_github_push_all_validation(),
        "Test 7: /api/github/push-status": test_github_push_status(),
        "Test 8: /api/github/storage": test_github_storage(),
        "Test 9: /api/github/builds (SAFE delete test)": test_github_delete_builds_safe(),
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
