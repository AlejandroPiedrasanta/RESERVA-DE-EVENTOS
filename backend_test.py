#!/usr/bin/env python3
"""
Backend API Testing for Cinema Productions - GitHub & Desktop Package System
Tests after major changes (Session Jul 3 2026 - Clean State)
"""

import requests
import time
import json
from typing import Dict, Any

# Backend URL from frontend/.env
BASE_URL = "https://continua-preview-1.preview.emergentagent.com/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}


def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    if passed:
        test_results["passed"] += 1
        print(f"{status}: {name}")
    else:
        test_results["failed"] += 1
        print(f"{status}: {name}")
        if details:
            print(f"  Details: {details}")


# ============================================================================
# BLOCK 1: GitHub without repo (clean state)
# ============================================================================

def test_block1_github_no_repo():
    """Block 1: Test GitHub endpoints when no repo is configured"""
    print("\n" + "="*70)
    print("BLOCK 1: GitHub sin repo (estado limpio)")
    print("="*70)
    
    # First, ensure clean state by clearing any existing config
    print("\n→ Limpiando configuración previa...")
    try:
        clear_payload = {"repo_url": ""}
        requests.post(f"{BASE_URL}/github/config", json=clear_payload, timeout=10)
        time.sleep(0.5)
    except:
        pass
    
    # Test 1.1: GET /api/github/config without repo
    print("\n=== Test 1.1: GET /api/github/config (sin repo) ===")
    try:
        response = requests.get(f"{BASE_URL}/github/config", timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/github/config - Status 200", False, f"Got {response.status_code}")
        else:
            log_test("GET /api/github/config - Status 200", True)
            
            data = response.json()
            
            # Check required keys
            required_keys = ["repo_url", "has_token", "last_commit_sha", "last_check_at", 
                           "branch", "is_configured", "suggested_repo"]
            missing_keys = [k for k in required_keys if k not in data]
            
            if missing_keys:
                log_test("GET /api/github/config - All required keys present", False, 
                        f"Missing: {missing_keys}")
            else:
                log_test("GET /api/github/config - All required keys present", True)
            
            # Check repo_url is empty
            if data.get("repo_url") == "":
                log_test("GET /api/github/config - repo_url is empty", True)
            else:
                log_test("GET /api/github/config - repo_url is empty", False, 
                        f"Got: {data.get('repo_url')}")
            
            # Check is_configured is false
            if data.get("is_configured") == False:
                log_test("GET /api/github/config - is_configured is false", True)
            else:
                log_test("GET /api/github/config - is_configured is false", False, 
                        f"Got: {data.get('is_configured')}")
            
            # Check suggested_repo
            expected_suggested = "https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
            if data.get("suggested_repo") == expected_suggested:
                log_test("GET /api/github/config - suggested_repo correct", True)
            else:
                log_test("GET /api/github/config - suggested_repo correct", False, 
                        f"Expected {expected_suggested}, got {data.get('suggested_repo')}")
            
            print(f"\nResponse: {json.dumps(data, indent=2)}")
            
    except Exception as e:
        log_test("GET /api/github/config - Request successful", False, str(e))
    
    # Test 1.2: GET /api/github/check-updates without repo (should return 400)
    print("\n=== Test 1.2: GET /api/github/check-updates (sin repo) ===")
    try:
        response = requests.get(f"{BASE_URL}/github/check-updates", timeout=10)
        
        if response.status_code == 400:
            log_test("GET /api/github/check-updates - Status 400 (no repo)", True)
            data = response.json()
            if "No hay repositorio" in data.get("detail", ""):
                log_test("GET /api/github/check-updates - Correct error message", True)
            else:
                log_test("GET /api/github/check-updates - Correct error message", False, 
                        f"Got: {data.get('detail')}")
        else:
            log_test("GET /api/github/check-updates - Status 400 (no repo)", False, 
                    f"Got {response.status_code}")
            
    except Exception as e:
        log_test("GET /api/github/check-updates - Request successful", False, str(e))


# ============================================================================
# BLOCK 2: GitHub with configured repo
# ============================================================================

def test_block2_github_with_repo():
    """Block 2: Test GitHub endpoints with configured repo"""
    print("\n" + "="*70)
    print("BLOCK 2: GitHub con repo configurado")
    print("="*70)
    
    # Test 2.1: POST /api/github/config with valid URL
    print("\n=== Test 2.1: POST /api/github/config (URL válida) ===")
    try:
        payload = {
            "repo_url": "https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS",
            "branch": "main"
        }
        
        response = requests.post(f"{BASE_URL}/github/config", json=payload, timeout=10)
        
        if response.status_code != 200:
            log_test("POST /api/github/config (valid) - Status 200", False, 
                    f"Got {response.status_code}: {response.text}")
        else:
            log_test("POST /api/github/config (valid) - Status 200", True)
            
            data = response.json()
            if data.get("success"):
                log_test("POST /api/github/config (valid) - Returns success:true", True)
            else:
                log_test("POST /api/github/config (valid) - Returns success:true", False)
        
        # Verify with GET
        time.sleep(0.5)
        get_response = requests.get(f"{BASE_URL}/github/config", timeout=10)
        if get_response.status_code == 200:
            get_data = get_response.json()
            if get_data.get("repo_url") == payload["repo_url"] and get_data.get("is_configured") == True:
                log_test("POST /api/github/config - Config reflected in GET", True)
            else:
                log_test("POST /api/github/config - Config reflected in GET", False,
                        f"repo_url: {get_data.get('repo_url')}, is_configured: {get_data.get('is_configured')}")
        
    except Exception as e:
        log_test("POST /api/github/config (valid) - Request successful", False, str(e))
    
    # Test 2.2: GET /api/github/check-updates with configured repo
    print("\n=== Test 2.2: GET /api/github/check-updates (con repo) ===")
    try:
        response = requests.get(f"{BASE_URL}/github/check-updates", timeout=15)
        
        if response.status_code != 200:
            log_test("GET /api/github/check-updates - Status 200", False, 
                    f"Got {response.status_code}: {response.text}")
        else:
            log_test("GET /api/github/check-updates - Status 200", True)
            
            data = response.json()
            
            # Check required keys
            required_keys = ["has_updates", "local_sha", "local_sha_short", "remote_sha", 
                           "remote_sha_short", "branch", "commits_ahead", "commits", "repo_url"]
            missing_keys = [k for k in required_keys if k not in data]
            
            if missing_keys:
                log_test("GET /api/github/check-updates - All required keys present", False, 
                        f"Missing: {missing_keys}")
            else:
                log_test("GET /api/github/check-updates - All required keys present", True)
            
            print(f"\nResponse summary:")
            print(f"  has_updates: {data.get('has_updates')}")
            print(f"  commits_ahead: {data.get('commits_ahead')}")
            print(f"  branch: {data.get('branch')}")
            print(f"  remote_sha_short: {data.get('remote_sha_short')}")
            
    except Exception as e:
        log_test("GET /api/github/check-updates - Request successful", False, str(e))
    
    # Test 2.3: POST /api/github/config with invalid URL
    print("\n=== Test 2.3: POST /api/github/config (URL inválida) ===")
    try:
        payload = {"repo_url": "pepito"}
        
        response = requests.post(f"{BASE_URL}/github/config", json=payload, timeout=10)
        
        if response.status_code == 400:
            log_test("POST /api/github/config (invalid) - Status 400", True)
        else:
            log_test("POST /api/github/config (invalid) - Status 400", False, 
                    f"Got {response.status_code}")
        
    except Exception as e:
        log_test("POST /api/github/config (invalid) - Request successful", False, str(e))


# ============================================================================
# BLOCK 3: Desktop Package Build/Download
# ============================================================================

def test_block3_desktop_package():
    """Block 3: Test desktop package compilation and download"""
    print("\n" + "="*70)
    print("BLOCK 3: Compilación del paquete Desktop")
    print("="*70)
    
    # Test 3.1: POST /api/download/package/rebuild
    print("\n=== Test 3.1: POST /api/download/package/rebuild ===")
    try:
        response = requests.post(f"{BASE_URL}/download/package/rebuild", timeout=10)
        
        if response.status_code != 200:
            log_test("POST /api/download/package/rebuild - Status 200", False, 
                    f"Got {response.status_code}: {response.text}")
        else:
            log_test("POST /api/download/package/rebuild - Status 200", True)
            
            data = response.json()
            status = data.get("status")
            progress = data.get("progress", 0)
            
            if status in ["building", "ready"]:
                log_test("POST /api/download/package/rebuild - Valid status", True, 
                        f"status={status}")
            else:
                log_test("POST /api/download/package/rebuild - Valid status", False, 
                        f"Got status={status}")
            
            if status == "building" and progress >= 10:
                log_test("POST /api/download/package/rebuild - Progress >= 10", True, 
                        f"progress={progress}")
            elif status == "ready" and progress == 100:
                log_test("POST /api/download/package/rebuild - Progress = 100 (ready)", True)
            else:
                log_test("POST /api/download/package/rebuild - Valid progress", False, 
                        f"status={status}, progress={progress}")
            
            print(f"\nInitial build status: {status}, progress: {progress}%")
            
    except Exception as e:
        log_test("POST /api/download/package/rebuild - Request successful", False, str(e))
    
    # Test 3.2: Polling GET /api/download/package/build-status
    print("\n=== Test 3.2: Polling GET /api/download/package/build-status ===")
    try:
        max_wait = 180  # 3 minutes
        poll_interval = 5  # 5 seconds
        start_time = time.time()
        final_status = None
        
        while time.time() - start_time < max_wait:
            response = requests.get(f"{BASE_URL}/download/package/build-status", timeout=10)
            
            if response.status_code != 200:
                log_test("GET /api/download/package/build-status - Status 200", False, 
                        f"Got {response.status_code}")
                break
            
            data = response.json()
            status = data.get("status")
            progress = data.get("progress", 0)
            message = data.get("message", "")
            
            elapsed = int(time.time() - start_time)
            print(f"  [{elapsed}s] status={status}, progress={progress}%, message={message[:50]}...")
            
            if status == "ready" and progress == 100:
                log_test("GET /api/download/package/build-status - Build completed", True, 
                        f"Completed in {elapsed}s")
                final_status = "ready"
                break
            elif status == "error":
                log_test("GET /api/download/package/build-status - Build completed", False, 
                        f"Build failed: {message}")
                final_status = "error"
                break
            
            time.sleep(poll_interval)
        
        if final_status is None:
            log_test("GET /api/download/package/build-status - Build completed", False, 
                    f"Timeout after {max_wait}s, still building")
        
    except Exception as e:
        log_test("GET /api/download/package/build-status - Request successful", False, str(e))
    
    # Test 3.3: GET /api/download/package (download the built package)
    print("\n=== Test 3.3: GET /api/download/package ===")
    try:
        response = requests.get(f"{BASE_URL}/download/package", timeout=30, stream=True)
        
        if response.status_code != 200:
            log_test("GET /api/download/package - Status 200", False, 
                    f"Got {response.status_code}: {response.text[:200]}")
        else:
            log_test("GET /api/download/package - Status 200", True)
            
            # Check content-type
            content_type = response.headers.get("content-type", "")
            if "application/zip" in content_type:
                log_test("GET /api/download/package - Content-Type is application/zip", True)
            else:
                log_test("GET /api/download/package - Content-Type is application/zip", False, 
                        f"Got: {content_type}")
            
            # Check content-length
            content_length = int(response.headers.get("content-length", 0))
            if content_length > 100000:  # > 100 KB
                log_test("GET /api/download/package - Content-Length > 100KB", True, 
                        f"Size: {content_length / 1024:.1f} KB")
            else:
                log_test("GET /api/download/package - Content-Length > 100KB", False, 
                        f"Size: {content_length / 1024:.1f} KB")
            
            # Check Content-Disposition header
            content_disp = response.headers.get("content-disposition", "")
            if content_disp.startswith("attachment; filename=cinema-productions-"):
                log_test("GET /api/download/package - Content-Disposition correct", True)
            else:
                log_test("GET /api/download/package - Content-Disposition correct", False, 
                        f"Got: {content_disp}")
            
    except Exception as e:
        log_test("GET /api/download/package - Request successful", False, str(e))


# ============================================================================
# BLOCK 4: Regression (existing endpoints)
# ============================================================================

def test_block4_regression():
    """Block 4: Test existing endpoints for regression"""
    print("\n" + "="*70)
    print("BLOCK 4: Regresión (endpoints existentes)")
    print("="*70)
    
    endpoints = [
        ("/", "GET /api/", lambda d: d.get("message") == "Event Reservation API"),
        ("/stats", "GET /api/stats", lambda d: all(k in d for k in ["total_reservations", "upcoming_events", "pending_payment", "real_income"])),
        ("/reservations", "GET /api/reservations", lambda d: isinstance(d, list)),
        ("/socios", "GET /api/socios", lambda d: isinstance(d, list)),
        ("/settings", "GET /api/settings", lambda d: isinstance(d, dict)),
        ("/ai-context", "GET /api/ai-context", lambda d: "content" in d and len(d.get("content", "")) > 0),
        ("/security/status", "GET /api/security/status", lambda d: isinstance(d, dict)),
        ("/backup/history", "GET /api/backup/history", lambda d: isinstance(d, list)),
    ]
    
    for endpoint, name, validator in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if validator(data):
                    log_test(f"{name} - Working", True)
                else:
                    log_test(f"{name} - Working", False, "Response structure invalid")
            else:
                log_test(f"{name} - Working", False, f"Status {response.status_code}")
                
        except Exception as e:
            log_test(f"{name} - Working", False, str(e))


# ============================================================================
# Cleanup & Summary
# ============================================================================

def cleanup():
    """Restore repo configuration"""
    print("\n" + "="*70)
    print("LIMPIEZA: Restaurando configuración del repo")
    print("="*70)
    
    try:
        payload = {
            "repo_url": "https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS",
            "branch": "main"
        }
        response = requests.post(f"{BASE_URL}/github/config", json=payload, timeout=10)
        
        if response.status_code == 200:
            print("✅ Repo restaurado correctamente")
        else:
            print(f"⚠️  No se pudo restaurar el repo: {response.status_code}")
            
    except Exception as e:
        print(f"⚠️  Error al restaurar repo: {e}")


def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("RESUMEN DE PRUEBAS")
    print("="*70)
    
    total = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total * 100) if total > 0 else 0
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {test_results['passed']} ✅")
    print(f"Failed: {test_results['failed']} ❌")
    print(f"Pass Rate: {pass_rate:.1f}%")
    
    if test_results["failed"] > 0:
        print("\n❌ FAILED TESTS:")
        for test in test_results["tests"]:
            if not test["passed"]:
                print(f"  - {test['name']}")
                if test["details"]:
                    print(f"    {test['details']}")
    
    print("\n" + "="*70)


if __name__ == "__main__":
    print("="*70)
    print("CINEMA PRODUCTIONS - BACKEND API TESTING")
    print("GitHub Updates & Desktop Package System (Clean State)")
    print("="*70)
    print(f"\nBackend URL: {BASE_URL}")
    print(f"Test Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run all test blocks
    test_block1_github_no_repo()
    test_block2_github_with_repo()
    test_block3_desktop_package()
    test_block4_regression()
    
    # Cleanup
    cleanup()
    
    # Print summary
    print_summary()
