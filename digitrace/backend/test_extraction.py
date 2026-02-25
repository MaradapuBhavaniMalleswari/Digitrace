#!/usr/bin/env python3
"""
Simple test script for Digital Forensics API
Tests extraction and retrieval endpoints with a real connected device
Run this while the FastAPI server is running on localhost:8000
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
TEST_CASE_NAME = "test_extraction"
EXTRACTION_TIMEOUT = 300  # 5 minutes
POLL_INTERVAL = 5  # seconds


class APITester:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.latest_job_id = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def test_health_check(self):
        """Test basic health check"""
        self.log("Testing health check...")
        try:
            response = self.session.get(f"{self.base_url}/health")
            response.raise_for_status()
            data = response.json()
            
            assert data["status"] == "healthy"
            self.log(f"✅ Health check passed - ADB Status: {data['adb_status']}")
            return True
        except Exception as e:
            self.log(f"❌ Health check failed: {e}", "ERROR")
            return False
    
    def test_device_status(self):
        """Test device connection status"""
        self.log("Testing device connection...")
        try:
            response = self.session.get(f"{self.base_url}/api/device/status")
            response.raise_for_status()
            data = response.json()
            
            if not data["connected"]:
                self.log("❌ No device connected! Please connect an Android device.", "ERROR")
                return False
            
            self.log(f"✅ Device connected: {len(data['connected_devices'])} device(s)")
            for device in data["connected_devices"]:
                self.log(f"   - {device['serial']}: {device['status']}")
            return True
        except Exception as e:
            self.log(f"❌ Device status check failed: {e}", "ERROR")
            return False
    
    def test_start_extraction(self):
        """Start extraction process"""
        self.log("Starting extraction process...")
        try:
            payload = {"case_name": TEST_CASE_NAME}
            response = self.session.post(f"{self.base_url}/api/extract", json=payload)
            response.raise_for_status()
            data = response.json()
            
            self.latest_job_id = data["job_id"]
            self.log(f"✅ Extraction started - Job ID: {self.latest_job_id}")
            return self.latest_job_id
        except Exception as e:
            self.log(f"❌ Failed to start extraction: {e}", "ERROR")
            return None
    
    def test_extraction_progress(self, job_id):
        """Monitor extraction progress until completion"""
        self.log(f"Monitoring extraction progress for job: {job_id}")
        start_time = time.time()
        
        while time.time() - start_time < EXTRACTION_TIMEOUT:
            try:
                response = self.session.get(f"{self.base_url}/api/extract/{job_id}/status")
                response.raise_for_status()
                status_data = response.json()
                
                status = status_data["status"]
                progress = status_data["progress"]
                message = status_data["message"]
                
                self.log(f"   {status.upper()} | {progress}% | {message}")
                
                if status == "completed":
                    elapsed = time.time() - start_time
                    self.log(f"✅ Extraction completed in {elapsed:.1f} seconds")
                    return True
                elif status == "failed":
                    error = status_data.get("error", "Unknown error")
                    self.log(f"❌ Extraction failed: {error}", "ERROR")
                    return False
                
                time.sleep(POLL_INTERVAL)
                
            except Exception as e:
                self.log(f"❌ Error checking status: {e}", "ERROR")
                return False
        
        self.log(f"❌ Extraction timed out after {EXTRACTION_TIMEOUT} seconds", "ERROR")
        return False
    
    def test_list_extractions(self):
        """Test listing extractions"""
        self.log("Testing extraction list...")
        try:
            response = self.session.get(f"{self.base_url}/api/extractions")
            response.raise_for_status()
            data = response.json()
            
            self.log(f"✅ Found {data['total']} extraction(s)")
            for extraction in data["extractions"][-3:]:  # Show last 3
                self.log(f"   - {extraction['job_id']}: {extraction['status']}")
            return True
        except Exception as e:
            self.log(f"❌ Failed to list extractions: {e}", "ERROR")
            return False
    
    def get_latest_completed_job(self):
        """Get the latest completed extraction job ID"""
        try:
            response = self.session.get(f"{self.base_url}/api/extractions")
            response.raise_for_status()
            data = response.json()
            
            completed_jobs = [e for e in data["extractions"] if e["status"] == "completed"]
            if not completed_jobs:
                self.log("❌ No completed extractions found", "ERROR")
                return None
            
            return completed_jobs[-1]["job_id"]
        except Exception as e:
            self.log(f"❌ Failed to get latest job: {e}", "ERROR")
            return None
    
    def test_device_info(self, job_id):
        """Test device info retrieval"""
        self.log("Testing device info retrieval...")
        try:
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/device-info")
            response.raise_for_status()
            data = response.json()
            
            device_info = data["device_info"]
            self.log(f"✅ Retrieved {len(device_info)} device properties")
            
            # Show key device info
            key_props = {
                "ro.product.manufacturer": "Manufacturer",
                "ro.product.model": "Model", 
                "ro.build.version.release": "Android Version",
                "ro.serialno": "Serial Number"
            }
            
            for prop, label in key_props.items():
                if prop in device_info:
                    self.log(f"   {label}: {device_info[prop]}")
            
            return True
        except Exception as e:
            self.log(f"❌ Failed to get device info: {e}", "ERROR")
            return False
    
    def test_packages(self, job_id):
        """Test packages retrieval"""
        self.log("Testing packages retrieval...")
        try:
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/packages")
            response.raise_for_status()
            data = response.json()
            
            self.log(f"✅ Retrieved {data['total']} installed packages")
            
            # Show first few packages
            for i, pkg in enumerate(data["packages"][:5]):
                if "package" in pkg:
                    self.log(f"   {i+1}. {pkg['package']}")
            
            return True
        except Exception as e:
            self.log(f"❌ Failed to get packages: {e}", "ERROR")
            return False
    
    def test_contacts(self, job_id):
        """Test contacts retrieval"""
        self.log("Testing contacts retrieval...")
        try:
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/contacts")
            response.raise_for_status()
            data = response.json()
            
            self.log(f"✅ Retrieved {data['total']} contacts")
            if data["total"] > 0:
                self.log(f"   Sample contact fields: {list(data['contacts'][0].keys())}")
            else:
                self.log("   (No contacts found - may require special permissions)")
            
            return True
        except Exception as e:
            self.log(f"❌ Failed to get contacts: {e}", "ERROR")
            return False
    
    def test_sms(self, job_id):
        """Test SMS retrieval"""
        self.log("Testing SMS retrieval...")
        try:
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/sms")
            response.raise_for_status()
            data = response.json()
            
            self.log(f"✅ Retrieved {data['total']} SMS messages")
            if data["total"] > 0:
                self.log(f"   Sample SMS fields: {list(data['sms'][0].keys())}")
            else:
                self.log("   (No SMS found - may require special permissions)")
            
            return True
        except Exception as e:
            self.log(f"❌ Failed to get SMS: {e}", "ERROR")
            return False
    
    def test_call_logs(self, job_id):
        """Test call logs retrieval"""
        self.log("Testing call logs retrieval...")
        try:
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/call-logs")
            response.raise_for_status()
            data = response.json()
            
            self.log(f"✅ Retrieved {data['total']} call log entries")
            if data["total"] > 0:
                self.log(f"   Sample call log fields: {list(data['call_logs'][0].keys())}")
            else:
                self.log("   (No call logs found - may require special permissions)")
            
            return True
        except Exception as e:
            self.log(f"❌ Failed to get call logs: {e}", "ERROR")
            return False
    
    def test_media(self, job_id):
        """Test media files retrieval"""
        self.log("Testing media files retrieval...")
        try:
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/media")
            response.raise_for_status()
            data = response.json()
            
            self.log(f"✅ Retrieved {data['total']} media files")
            for i, media in enumerate(data["media"][:3]):
                size_mb = media["size"] / (1024 * 1024)
                self.log(f"   {i+1}. {media['filename']} ({size_mb:.2f} MB)")
            
            return True
        except Exception as e:
            self.log(f"❌ Failed to get media: {e}", "ERROR")
            return False
    
    def test_summary(self, job_id):
        """Test extraction summary"""
        self.log("Testing extraction summary...")
        try:
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/summary")
            response.raise_for_status()
            data = response.json()
            
            size_mb = data["total_size"] / (1024 * 1024)
            self.log(f"✅ Extraction summary:")
            self.log(f"   Files: {data['files_count']}")
            self.log(f"   Total size: {size_mb:.2f} MB")
            self.log(f"   Artifacts: {len(data['artifacts'])}")
            
            return True
        except Exception as e:
            self.log(f"❌ Failed to get summary: {e}", "ERROR")
            return False
    
    def test_file_access(self, job_id):
        """Test file access endpoints"""
        self.log("Testing file access...")
        try:
            # Test HTML report
            response = self.session.get(f"{self.base_url}/api/extract/{job_id}/report")
            if response.status_code == 200:
                self.log("✅ HTML report accessible")
            
            # Test ZIP download
            response = self.session.head(f"{self.base_url}/api/extract/{job_id}/download")
            if response.status_code == 200:
                self.log("✅ ZIP download accessible")
            
            # Test media file access
            media_response = self.session.get(f"{self.base_url}/api/extract/{job_id}/media")
            if media_response.status_code == 200:
                media_data = media_response.json()
                if media_data["total"] > 0:
                    first_media = media_data["media"][0]["filename"]
                    file_response = self.session.head(f"{self.base_url}/api/extract/{job_id}/media/{first_media}")
                    if file_response.status_code == 200:
                        self.log(f"✅ Media file accessible: {first_media}")
            
            return True
        except Exception as e:
            self.log(f"❌ File access test failed: {e}", "ERROR")
            return False
    
    def test_storage_info(self):
        """Test storage information"""
        self.log("Testing storage info...")
        try:
            response = self.session.get(f"{self.base_url}/api/system/storage")
            response.raise_for_status()
            data = response.json()
            
            total_size_mb = data["total_size"] / (1024 * 1024)
            self.log(f"✅ Storage info:")
            self.log(f"   Total extractions: {data['total_extractions']}")
            self.log(f"   Total size: {total_size_mb:.2f} MB")
            
            return True
        except Exception as e:
            self.log(f"❌ Storage info test failed: {e}", "ERROR")
            return False


def run_all_tests():
    """Run the complete test suite"""
    print("🚀 Starting Digital Forensics API Test Suite")
    print(f"Testing server at: {BASE_URL}")
    print("=" * 60)
    
    tester = APITester()
    
    # Phase 1: Basic connectivity tests
    print("\n📡 Phase 1: Connectivity Tests")
    if not tester.test_health_check():
        print("❌ Server not responding! Make sure the FastAPI server is running.")
        return False
    
    if not tester.test_device_status():
        print("❌ Device not connected! Please connect an Android device and enable USB debugging.")
        return False
    
    # Phase 2: Extraction test
    print("\n🔍 Phase 2: Extraction Test")
    job_id = tester.test_start_extraction()
    if not job_id:
        return False
    
    if not tester.test_extraction_progress(job_id):
        return False
    
    tester.test_list_extractions()
    
    # Phase 3: Data retrieval tests
    print("\n📊 Phase 3: Data Retrieval Tests")
    # Use the job we just completed
    test_job_id = job_id
    
    tester.test_device_info(test_job_id)
    tester.test_packages(test_job_id)
    tester.test_contacts(test_job_id)
    tester.test_sms(test_job_id)
    tester.test_call_logs(test_job_id)
    tester.test_media(test_job_id)
    tester.test_summary(test_job_id)
    
    # Phase 4: File access tests
    print("\n📁 Phase 4: File Access Tests")
    tester.test_file_access(test_job_id)
    tester.test_storage_info()
    
    print("\n🎉 All tests completed!")
    print("=" * 60)
    print("Summary:")
    print(f"✅ Extraction completed successfully")
    print(f"📂 Job ID: {test_job_id}")
    print(f"🌐 View report: {BASE_URL}/api/extract/{test_job_id}/report")
    print(f"⬇️  Download ZIP: {BASE_URL}/api/extract/{test_job_id}/download")
    
    return True


if __name__ == "__main__":
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        sys.exit(1)