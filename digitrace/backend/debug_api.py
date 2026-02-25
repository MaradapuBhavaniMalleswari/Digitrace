#!/usr/bin/env python3
"""
Debug script to test ADB connection and API endpoints step by step
"""

import urllib.request
import urllib.parse
import json
import time
import subprocess
import sys

BASE_URL = "http://localhost:8000"

def run_command(cmd):
    """Run a command and return output"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)

def make_request(url, method="GET", data=None, timeout=30):
    """Make HTTP request with longer timeout"""
    try:
        if method == "POST" and data:
            data = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        else:
            req = urllib.request.Request(url)
        
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.getcode(), json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            error_body = e.read().decode('utf-8')
            return e.code, {"error": f"HTTP {e.code}", "details": error_body}
        except:
            return e.code, {"error": f"HTTP {e.code}"}
    except Exception as e:
        return 0, {"error": str(e)}

def debug_adb_directly():
    """Test ADB connection directly"""
    print("🔍 Testing ADB connection directly...")
    
    # Test adb version
    rc, out, err = run_command(["adb", "version"])
    if rc == 0:
        print(f"   ✅ ADB version: {out.strip().split()[2] if out.strip() else 'Unknown'}")
    else:
        print(f"   ❌ ADB not found: {err}")
        return False
    
    # Test adb devices
    rc, out, err = run_command(["adb", "devices"])
    if rc == 0:
        lines = out.strip().split('\n')
        devices = [line for line in lines[1:] if line.strip() and '\t' in line]
        print(f"   Devices found: {len(devices)}")
        for device in devices:
            serial, status = device.split('\t')
            print(f"      - {serial}: {status}")
        
        authorized_devices = [d for d in devices if d.endswith('\tdevice')]
        if not authorized_devices:
            print("   ❌ No authorized devices found!")
            print("   💡 Make sure USB Debugging is enabled and computer is authorized")
            return False
        else:
            print(f"   ✅ {len(authorized_devices)} authorized device(s)")
            return True
    else:
        print(f"   ❌ ADB devices failed: {err}")
        return False

def test_api_step_by_step():
    """Test API endpoints step by step with debugging"""
    print("\n🧪 Testing API endpoints...")
    
    # Test basic connection
    print("1. Testing server connection...")
    status, data = make_request(f"{BASE_URL}/", timeout=5)
    if status == 200:
        print(f"   ✅ Server responding: {data.get('message', 'OK')}")
    else:
        print(f"   ❌ Server not responding: {data}")
        return False
    
    # Test health endpoint
    print("2. Testing health endpoint...")
    status, data = make_request(f"{BASE_URL}/health", timeout=10)
    if status == 200:
        print(f"   ✅ Health: {data.get('status', 'Unknown')}")
        print(f"   ADB Status: {data.get('adb_status', 'Unknown')}")
        if data.get('adb_status') != 'available':
            print("   ⚠️  ADB not available through API")
    else:
        print(f"   ❌ Health check failed: {data}")
        return False
    
    # Test device status endpoint
    print("3. Testing device status endpoint...")
    status, data = make_request(f"{BASE_URL}/api/device/status", timeout=15)
    if status == 200:
        connected = data.get('connected', False)
        print(f"   Device connected: {connected}")
        if connected:
            devices = data.get('connected_devices', [])
            print(f"   Connected devices: {len(devices)}")
            for device in devices:
                print(f"      - {device.get('serial', 'Unknown')}: {device.get('status', 'Unknown')}")
        else:
            print(f"   ❌ No devices connected via API")
            print(f"   Error details: {data.get('error', 'Unknown')}")
            return False
    else:
        print(f"   ❌ Device status failed: {data}")
        return False
    
    # Test extraction with longer timeout
    print("4. Testing extraction start (with 60s timeout)...")
    status, data = make_request(f"{BASE_URL}/api/extract", "POST", 
                               {"case_name": "debug_test"}, timeout=60)
    if status == 200:
        job_id = data.get('job_id')
        print(f"   ✅ Extraction started: {job_id}")
        
        # Monitor for 2 minutes
        print("5. Monitoring extraction progress...")
        for i in range(24):  # Check every 5 seconds for 2 minutes
            time.sleep(5)
            status, status_data = make_request(f"{BASE_URL}/api/extract/{job_id}/status", timeout=10)
            if status == 200:
                progress = status_data.get('progress', 0)
                message = status_data.get('message', 'No message')
                state = status_data.get('status', 'unknown')
                print(f"      [{i*5:02d}s] {state.upper()}: {progress}% - {message}")
                
                if state == "completed":
                    print("   ✅ Extraction completed successfully!")
                    return job_id
                elif state == "failed":
                    error = status_data.get('error', 'Unknown error')
                    print(f"   ❌ Extraction failed: {error}")
                    return False
            else:
                print(f"      Status check failed: {status_data}")
        
        print("   ⏳ Extraction still running after 2 minutes (normal for full extraction)")
        return job_id
    else:
        print(f"   ❌ Failed to start extraction: {data}")
        return False

def main():
    print("🔧 Digital Forensics API Debug Tool")
    print("=" * 50)
    
    # Step 1: Test ADB directly
    if not debug_adb_directly():
        print("\n❌ ADB connection issues detected!")
        print("Please:")
        print("1. Make sure ADB is installed and in PATH")
        print("2. Connect your Android device via USB")
        print("3. Enable USB Debugging in Developer Options")
        print("4. Authorize this computer on your device")
        print("5. Run 'adb devices' to verify connection")
        return False
    
    # Step 2: Test API
    result = test_api_step_by_step()
    
    if result:
        print(f"\n🎉 Debug completed successfully!")
        if isinstance(result, str):
            print(f"Job ID: {result}")
            print(f"Status URL: {BASE_URL}/api/extract/{result}/status")
            print(f"Report URL: {BASE_URL}/api/extract/{result}/report")
    else:
        print(f"\n❌ Debug found issues!")
    
    return bool(result)

if __name__ == "__main__":
    try:
        success = main()
        input("\nPress Enter to exit...")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nDebug interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        input("Press Enter to exit...")
        sys.exit(1)