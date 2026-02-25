#!/usr/bin/env python3
"""
Quick test for the fixed ADB functions
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

import adb

def test_adb_functions():
    print("🧪 Testing ADB functions...")
    
    # Test basic run function
    print("1. Testing ADB version...")
    rc, out, err = adb.run(["adb", "version"])
    if rc == 0:
        print(f"   ✅ ADB working: {out.split()[2] if out.split() else 'Unknown version'}")
    else:
        print(f"   ❌ ADB failed: {err}")
        return False
    
    # Test device detection
    print("2. Testing device detection...")
    try:
        adb.require_adb()
        print("   ✅ Device detection successful")
    except SystemExit:
        print("   ❌ No devices found")
        return False
    
    # Test getprop (creates temp dir)
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        print("3. Testing getprop collection...")
        try:
            device_info = adb.collect_getprop(tmpdir)
            print(f"   ✅ Collected {len(device_info)} device properties")
            if 'ro.product.manufacturer' in device_info:
                print(f"   Device: {device_info.get('ro.product.manufacturer', 'Unknown')} {device_info.get('ro.product.model', 'Unknown')}")
        except Exception as e:
            print(f"   ❌ Getprop failed: {e}")
            return False
        
        print("4. Testing package collection...")
        try:
            packages = adb.collect_packages(tmpdir)
            print(f"   ✅ Collected {len(packages)} packages")
        except Exception as e:
            print(f"   ❌ Package collection failed: {e}")
            return False
    
    print("\n🎉 All ADB function tests passed!")
    return True

if __name__ == "__main__":
    success = test_adb_functions()
    input("\nPress Enter to exit...")
    sys.exit(0 if success else 1)