#!/usr/bin/env python3
"""
Simple test to check if server endpoints are responding
"""

import urllib.request
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(url, name):
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"✅ {name}: {response.getcode()} - {data}")
            return True
    except Exception as e:
        print(f"❌ {name}: {e}")
        return False

print("🔍 Testing individual endpoints...")
print("=" * 40)

# Test basic endpoints
test_endpoint(f"{BASE_URL}/", "Root endpoint")
test_endpoint(f"{BASE_URL}/health", "Health endpoint")
test_endpoint(f"{BASE_URL}/api/device/status", "Device status")
test_endpoint(f"{BASE_URL}/api/extractions", "Extractions list")

print("\nIf all endpoints work, the server is running correctly.")
print("The timeout issue might be in the extraction process itself.")