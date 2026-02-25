#!/usr/bin/env python3
"""
Quick manual test to verify the API is working
Run this while the FastAPI server is running
"""

import urllib.request
import urllib.parse
import json
import time
import sys

BASE_URL = "http://localhost:8000"

def make_request(url, method="GET", data=None):
    """Make HTTP request using urllib"""
    try:
        if method == "POST" and data:
            data = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
        else:
            req = urllib.request.Request(url)
        
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.getcode(), json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}

def test_basic_endpoints():
    print("🧪 Quick API Test")
    print("=" * 40)
    
    # Test health
    print("1. Testing health endpoint...")
    status, data = make_request(f"{BASE_URL}/health")
    if status == 200:
        print(f"   ✅ Health: {data['status']}, ADB: {data['adb_status']}")
    else:
        print(f"   ❌ Health check failed: {data}")
        return False
    
    # Test device status
    print("2. Testing device status...")
    status, data = make_request(f"{BASE_URL}/api/device/status")
    if status == 200 and data.get("connected"):
        print(f"   ✅ Device connected: {len(data['connected_devices'])} device(s)")
        for dev in data['connected_devices']:
            print(f"      - {dev['serial']}")
    else:
        print(f"   ❌ No device connected: {data}")
        return False
    
    # Test starting extraction
    print("3. Testing extraction start...")
    status, data = make_request(f"{BASE_URL}/api/extract", "POST", {"case_name": "quick_test"})
    if status == 200:
        job_id = data['job_id']
        print(f"   ✅ Extraction started: {job_id}")
        
        # Monitor for a bit
        print("4. Monitoring extraction (30 seconds)...")
        for i in range(6):  # Check 6 times over 30 seconds
            time.sleep(5)
            status, status_data = make_request(f"{BASE_URL}/api/extract/{job_id}/status")
            if status == 200:
                progress = status_data['progress']
                msg = status_data['message']
                state = status_data['status']
                print(f"      {state.upper()}: {progress}% - {msg}")
                
                if state == "completed":
                    print("   ✅ Extraction completed!")
                    return job_id
                elif state == "failed":
                    print(f"   ❌ Extraction failed: {status_data.get('error')}")
                    return False
        
        print("   ⏳ Extraction still running (this is normal for full extraction)")
        return job_id
    else:
        print(f"   ❌ Failed to start extraction: {data}")
        return False

if __name__ == "__main__":
    print("Make sure the FastAPI server is running on localhost:8000")
    print("You can start it with: python run_server.py")
    print()
    
    try:
        result = test_basic_endpoints()
        if result:
            print(f"\n🎉 Basic tests passed!")
            if isinstance(result, str):
                print(f"Job ID: {result}")
                print(f"Check status: {BASE_URL}/api/extract/{result}/status")
        else:
            print(f"\n❌ Tests failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)