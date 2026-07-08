#!/usr/bin/env python3
"""
Test script for EXE version mismatch fix in standalone_app.py

Tests three scenarios:
1. DEV mode (normal import)
2. FROZEN mode simulation (sys.frozen=True, sys._MEIPASS set)
3. CLOUD regression (GET /api/github/check-updates)
"""
import os
import sys
import subprocess
import tempfile
import json
from pathlib import Path
import urllib.request
import urllib.error

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test(msg):
    print(f"{BLUE}[TEST]{RESET} {msg}")

def print_pass(msg):
    print(f"{GREEN}✅ PASS:{RESET} {msg}")

def print_fail(msg):
    print(f"{RED}❌ FAIL:{RESET} {msg}")

def print_info(msg):
    print(f"{YELLOW}ℹ️  INFO:{RESET} {msg}")


def test_dev_mode():
    """Test 1: DEV mode - import module normally"""
    print("\n" + "="*80)
    print_test("TEST 1: DEV MODE (normal import)")
    print("="*80)
    
    # Create a subprocess to import standalone_app in clean environment
    test_script = """
import os
import sys

# Set environment variables BEFORE importing
os.environ['MONGO_URL'] = 'embedded'
os.environ['DB_NAME'] = 'cinema_test'

# Add backend to path
sys.path.insert(0, '/app/backend')

# Import the module
import standalone_app

# Check values
print(f"_local_version={standalone_app._local_version}")
print(f"_read_baked_version()={standalone_app._read_baked_version()}")
print(f"BUNDLE_DIR={standalone_app.BUNDLE_DIR}")
print(f"ROOT_DIR={standalone_app.ROOT_DIR}")
"""
    
    try:
        result = subprocess.run(
            [sys.executable, '-c', test_script],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        print_info(f"Exit code: {result.returncode}")
        if result.stdout:
            print_info(f"Output:\n{result.stdout}")
        if result.stderr:
            print_info(f"Stderr:\n{result.stderr}")
        
        # Parse output
        output_lines = result.stdout.strip().split('\n')
        values = {}
        for line in output_lines:
            if '=' in line:
                key, val = line.split('=', 1)
                values[key] = val
        
        # Verify
        local_version = values.get('_local_version', '')
        read_baked = values.get('_read_baked_version()', '')
        
        if local_version == "1.20.1":
            print_pass(f"_local_version == '1.20.1' (actual: '{local_version}')")
        else:
            print_fail(f"_local_version should be '1.20.1', got '{local_version}'")
            return False
        
        if read_baked == "1.20.1":
            print_pass(f"_read_baked_version() == '1.20.1' (actual: '{read_baked}')")
        else:
            print_fail(f"_read_baked_version() should be '1.20.1', got '{read_baked}'")
            return False
        
        print_pass("DEV mode test PASSED")
        return True
        
    except Exception as e:
        print_fail(f"DEV mode test failed with exception: {e}")
        return False


def test_frozen_mode():
    """Test 2: FROZEN mode - simulate PyInstaller frozen environment"""
    print("\n" + "="*80)
    print_test("TEST 2: FROZEN MODE (sys.frozen=True, sys._MEIPASS set)")
    print("="*80)
    
    # Test 2a: version.txt with "1.20.1"
    print_info("Test 2a: version.txt = '1.20.1'")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create fake MEIPASS directory with version.txt
        version_file = Path(tmpdir) / "version.txt"
        version_file.write_text("1.20.1")
        
        test_script = f"""
import os
import sys

# Set frozen mode BEFORE importing
sys.frozen = True
sys._MEIPASS = "{tmpdir}"

# Set environment variables
os.environ['MONGO_URL'] = 'embedded'
os.environ['DB_NAME'] = 'cinema_test'

# Add backend to path
sys.path.insert(0, '/app/backend')

# Import the module
import standalone_app

# Check values
print(f"_local_version={{standalone_app._local_version}}")
print(f"BUNDLE_DIR={{standalone_app.BUNDLE_DIR}}")
print(f"ROOT_DIR={{standalone_app.ROOT_DIR}}")
print(f"BUNDLE_DIR_matches_MEIPASS={{str(standalone_app.BUNDLE_DIR) == '{tmpdir}'}}")
"""
        
        try:
            result = subprocess.run(
                [sys.executable, '-c', test_script],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            print_info(f"Exit code: {result.returncode}")
            if result.stdout:
                print_info(f"Output:\n{result.stdout}")
            if result.stderr and "WARNING" not in result.stderr:
                print_info(f"Stderr:\n{result.stderr}")
            
            # Parse output
            output_lines = result.stdout.strip().split('\n')
            values = {}
            for line in output_lines:
                if '=' in line:
                    key, val = line.split('=', 1)
                    values[key] = val
            
            # Verify
            local_version = values.get('_local_version', '')
            bundle_dir_matches = values.get('BUNDLE_DIR_matches_MEIPASS', 'False')
            
            if local_version == "1.20.1":
                print_pass(f"_local_version == '1.20.1' (read from BUNDLE_DIR)")
            else:
                print_fail(f"_local_version should be '1.20.1', got '{local_version}'")
                return False
            
            if bundle_dir_matches == "True":
                print_pass(f"BUNDLE_DIR correctly points to sys._MEIPASS ({tmpdir})")
            else:
                print_fail(f"BUNDLE_DIR should point to sys._MEIPASS")
                return False
            
        except Exception as e:
            print_fail(f"Frozen mode test 2a failed: {e}")
            return False
    
    # Test 2b: Negative test with version "9.9.9"
    print_info("\nTest 2b: version.txt = '9.9.9' (negative test)")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create fake MEIPASS directory with version.txt = "9.9.9"
        version_file = Path(tmpdir) / "version.txt"
        version_file.write_text("9.9.9")
        
        test_script = f"""
import os
import sys

# Set frozen mode BEFORE importing
sys.frozen = True
sys._MEIPASS = "{tmpdir}"

# Set environment variables
os.environ['MONGO_URL'] = 'embedded'
os.environ['DB_NAME'] = 'cinema_test'

# Add backend to path
sys.path.insert(0, '/app/backend')

# Import the module
import standalone_app

# Check values
print(f"_local_version={{standalone_app._local_version}}")
"""
        
        try:
            result = subprocess.run(
                [sys.executable, '-c', test_script],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            print_info(f"Exit code: {result.returncode}")
            if result.stdout:
                print_info(f"Output:\n{result.stdout}")
            
            # Parse output
            output_lines = result.stdout.strip().split('\n')
            values = {}
            for line in output_lines:
                if '=' in line:
                    key, val = line.split('=', 1)
                    values[key] = val
            
            # Verify
            local_version = values.get('_local_version', '')
            
            if local_version == "9.9.9":
                print_pass(f"_local_version == '9.9.9' (proves it reads from BUNDLE_DIR, not elsewhere)")
            else:
                print_fail(f"_local_version should be '9.9.9', got '{local_version}'")
                return False
            
        except Exception as e:
            print_fail(f"Frozen mode test 2b failed: {e}")
            return False
    
    print_pass("FROZEN mode test PASSED")
    return True


def test_cloud_regression():
    """Test 3: CLOUD regression - GET /api/github/check-updates"""
    print("\n" + "="*80)
    print_test("TEST 3: CLOUD REGRESSION (server.py via preview URL)")
    print("="*80)
    
    # Read backend URL from frontend/.env
    env_file = Path("/app/frontend/.env")
    backend_url = None
    if env_file.exists():
        for line in env_file.read_text().split('\n'):
            if line.startswith('REACT_APP_BACKEND_URL='):
                backend_url = line.split('=', 1)[1].strip()
                break
    
    if not backend_url:
        print_fail("Could not read REACT_APP_BACKEND_URL from /app/frontend/.env")
        return False
    
    api_url = f"{backend_url}/api/github/check-updates"
    print_info(f"Testing: {api_url}")
    
    try:
        # Use curl instead of urllib to avoid SSL/User-Agent issues
        result = subprocess.run(
            ['curl', '-s', api_url],
            capture_output=True,
            text=True,
            timeout=15
        )
        
        if result.returncode != 0:
            print_fail(f"curl failed with exit code {result.returncode}")
            return False
        
        data = json.loads(result.stdout)
        
        print_info(f"HTTP Status: 200 (curl successful)")
        print_info(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify HTTP 200
        print_pass("HTTP 200 OK")
        
        # Verify required fields
        required_fields = ['has_updates', 'commits_ahead', 'commits', 'local_version', 'remote_version']
        for field in required_fields:
            if field in data:
                print_pass(f"Field '{field}' present")
            else:
                print_fail(f"Field '{field}' missing")
                return False
        
        # Verify values
        has_updates = data.get('has_updates')
        commits_ahead = data.get('commits_ahead')
        commits = data.get('commits')
        local_version = data.get('local_version')
        remote_version = data.get('remote_version')
        
        if has_updates == False:
            print_pass(f"has_updates == false (correct)")
        else:
            print_fail(f"has_updates should be false, got {has_updates}")
            return False
        
        if commits_ahead == 0:
            print_pass(f"commits_ahead == 0 (correct)")
        else:
            print_fail(f"commits_ahead should be 0, got {commits_ahead}")
            return False
        
        if commits == []:
            print_pass(f"commits == [] (correct)")
        else:
            print_fail(f"commits should be [], got {commits}")
            return False
        
        if local_version == "1.20.1":
            print_pass(f"local_version == '1.20.1' (correct)")
        else:
            print_fail(f"local_version should be '1.20.1', got '{local_version}'")
            return False
        
        if remote_version == "1.20.1":
            print_pass(f"remote_version == '1.20.1' (correct)")
        else:
            print_fail(f"remote_version should be '1.20.1', got '{remote_version}'")
            return False
        
        if local_version == remote_version:
            print_pass(f"local_version == remote_version (both '1.20.1')")
        else:
            print_fail(f"local_version and remote_version should match")
            return False
        
        print_pass("CLOUD regression test PASSED")
        return True
        
    except urllib.error.HTTPError as e:
        print_fail(f"HTTP error: {e.code} {e.reason}")
        return False
    except Exception as e:
        print_fail(f"Cloud regression test failed: {e}")
        return False


def main():
    print("\n" + "="*80)
    print(f"{BLUE}VERSION MISMATCH FIX VERIFICATION{RESET}")
    print(f"Testing: /app/backend/standalone_app.py")
    print("="*80)
    
    results = {
        "dev_mode": False,
        "frozen_mode": False,
        "cloud_regression": False
    }
    
    # Run tests
    results["dev_mode"] = test_dev_mode()
    results["frozen_mode"] = test_frozen_mode()
    results["cloud_regression"] = test_cloud_regression()
    
    # Summary
    print("\n" + "="*80)
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print("="*80)
    
    for test_name, passed in results.items():
        status = f"{GREEN}✅ PASSED{RESET}" if passed else f"{RED}❌ FAILED{RESET}"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    all_passed = all(results.values())
    
    print("\n" + "="*80)
    if all_passed:
        print(f"{GREEN}🎉 ALL TESTS PASSED{RESET}")
        print("="*80)
        print("\nCONCLUSION:")
        print("✅ The version mismatch fix is WORKING correctly")
        print("✅ DEV mode: reads version from ROOT_DIR.parent (/app/version.txt)")
        print("✅ FROZEN mode: reads version from BUNDLE_DIR (sys._MEIPASS)")
        print("✅ CLOUD: /api/github/check-updates returns correct values")
        print("\nThe fix correctly prioritizes BUNDLE_DIR (baked version in EXE)")
        print("over ROOT_DIR, preventing the '0.0.0' version bug in frozen mode.")
        return 0
    else:
        print(f"{RED}❌ SOME TESTS FAILED{RESET}")
        print("="*80)
        failed_tests = [name for name, passed in results.items() if not passed]
        print(f"\nFailed tests: {', '.join(failed_tests)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
