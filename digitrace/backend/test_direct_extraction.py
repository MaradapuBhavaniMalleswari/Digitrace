#!/usr/bin/env python3
"""
Test the extraction function directly without the API
"""

import sys
import os
import tempfile
import time

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

import adb

def test_direct_extraction():
    print("🧪 Testing direct ADB extraction...")
    print("=" * 40)
    
    # Create a temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Using temp directory: {temp_dir}")
        
        print("\n1. Testing device connection...")
        try:
            adb.require_adb()
            print("   ✅ Device connected")
        except SystemExit:
            print("   ❌ No device connected")
            return False
        
        print("\n2. Testing device info collection...")
        try:
            device_info = adb.collect_getprop(temp_dir)
            print(f"   ✅ Collected {len(device_info)} properties")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        print("\n3. Testing package collection...")
        try:
            packages = adb.collect_packages(temp_dir)
            print(f"   ✅ Collected {len(packages)} packages")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        print("\n4. Testing logcat collection...")
        try:
            logcat_path = adb.collect_logcat(temp_dir)
            print(f"   ✅ Logcat saved to {os.path.basename(logcat_path)}")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        print("\n5. Testing content queries...")
        try:
            for uri, name in [("content://sms", "sms"), ("content://call_log/calls", "calls"), ("content://contacts/phones", "contacts")]:
                print(f"   Querying {name}...")
                p, rows = adb.try_content_query(uri, temp_dir, name)
                print(f"      {name}: {len(rows)} rows")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        print("\n6. Testing media collection (limited)...")
        try:
            pulled, listfile = adb.list_and_pull_recent_media(temp_dir, limit=5)
            print(f"   ✅ Pulled {len(pulled)} media files")
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            return False
        
        print("\n🎉 Direct extraction test completed successfully!")
        print(f"All files are in: {temp_dir}")
        
        # List what was created
        print("\nFiles created:")
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                rel_path = os.path.relpath(os.path.join(root, file), temp_dir)
                print(f"   - {rel_path}")
        
        return True

if __name__ == "__main__":
    success = test_direct_extraction()
    input("\nPress Enter to exit...")
    sys.exit(0 if success else 1)