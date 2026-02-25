"""
Test suite for Digital Forensics API
Tests the extraction and retrieval endpoints with a real connected device
"""

import pytest
import asyncio
import json
import time
import os
from httpx import AsyncClient
from main import app

# Test configuration
TEST_CASE_NAME = "test_extraction"
EXTRACTION_TIMEOUT = 300  # 5 minutes timeout for extraction
POLL_INTERVAL = 5  # Check status every 5 seconds


class TestDigitalForensicsAPI:
    """Test class for the Digital Forensics API"""
    
    @pytest.fixture
    async def client(self):
        """Create test client"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac
    
    @pytest.fixture
    def event_loop(self):
        """Create event loop for async tests"""
        loop = asyncio.new_event_loop()
        yield loop
        loop.close()

    async def test_health_check(self, client: AsyncClient):
        """Test health check endpoint"""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "adb_status" in data
        print(f"✅ Health check passed - ADB Status: {data['adb_status']}")

    async def test_device_status(self, client: AsyncClient):
        """Test device connection status"""
        response = await client.get("/api/device/status")
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert data["connected"] is True, "Device must be connected for testing"
        assert "connected_devices" in data
        assert len(data["connected_devices"]) > 0, "At least one device must be connected"
        
        print(f"✅ Device status check passed")
        print(f"   Connected devices: {len(data['connected_devices'])}")
        for device in data["connected_devices"]:
            print(f"   - {device['serial']}: {device['status']}")

    async def test_start_extraction(self, client: AsyncClient):
        """Test starting an extraction process"""
        payload = {"case_name": TEST_CASE_NAME}
        response = await client.post("/api/extract", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "job_id" in data
        assert "status" in data
        assert data["status"] == "pending"
        
        job_id = data["job_id"]
        print(f"✅ Extraction started successfully")
        print(f"   Job ID: {job_id}")
        
        return job_id

    async def test_extraction_status_polling(self, client: AsyncClient):
        """Test extraction status endpoint and wait for completion"""
        # Start extraction
        job_id = await self.test_start_extraction(client)
        
        start_time = time.time()
        print(f"⏳ Polling extraction status for job: {job_id}")
        
        while time.time() - start_time < EXTRACTION_TIMEOUT:
            response = await client.get(f"/api/extract/{job_id}/status")
            assert response.status_code == 200
            
            status_data = response.json()
            assert "status" in status_data
            assert "progress" in status_data
            assert "message" in status_data
            
            current_status = status_data["status"]
            progress = status_data["progress"]
            message = status_data["message"]
            
            print(f"   Status: {current_status} | Progress: {progress}% | {message}")
            
            if current_status == "completed":
                print(f"✅ Extraction completed successfully in {time.time() - start_time:.1f} seconds")
                return job_id
            elif current_status == "failed":
                error = status_data.get("error", "Unknown error")
                pytest.fail(f"Extraction failed: {error}")
            
            await asyncio.sleep(POLL_INTERVAL)
        
        pytest.fail(f"Extraction timed out after {EXTRACTION_TIMEOUT} seconds")

    async def test_list_extractions(self, client: AsyncClient):
        """Test listing all extractions"""
        response = await client.get("/api/extractions")
        assert response.status_code == 200
        data = response.json()
        
        assert "extractions" in data
        assert "total" in data
        assert isinstance(data["extractions"], list)
        assert data["total"] >= 0
        
        print(f"✅ Listed extractions: {data['total']} total")

    async def test_device_info_retrieval(self, client: AsyncClient):
        """Test retrieving device information"""
        # Use the most recent extraction
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        response = await client.get(f"/api/extract/{job_id}/device-info")
        assert response.status_code == 200
        data = response.json()
        
        assert "device_info" in data
        device_info = data["device_info"]
        
        # Check for common device properties
        expected_props = ["ro.product.manufacturer", "ro.product.model", "ro.build.version.release"]
        found_props = []
        for prop in expected_props:
            if prop in device_info:
                found_props.append(prop)
                print(f"   {prop}: {device_info[prop]}")
        
        print(f"✅ Device info retrieved: {len(device_info)} properties")
        print(f"   Found common properties: {found_props}")

    async def test_packages_retrieval(self, client: AsyncClient):
        """Test retrieving installed packages"""
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        response = await client.get(f"/api/extract/{job_id}/packages")
        assert response.status_code == 200
        data = response.json()
        
        assert "packages" in data
        assert "total" in data
        packages = data["packages"]
        
        print(f"✅ Packages retrieved: {data['total']} packages")
        
        # Show first few packages as examples
        for i, pkg in enumerate(packages[:5]):
            if "package" in pkg:
                print(f"   {i+1}. {pkg['package']}")

    async def test_contacts_retrieval(self, client: AsyncClient):
        """Test retrieving contacts"""
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        response = await client.get(f"/api/extract/{job_id}/contacts")
        assert response.status_code == 200
        data = response.json()
        
        assert "contacts" in data
        assert "total" in data
        
        print(f"✅ Contacts retrieved: {data['total']} contacts")
        if data["total"] > 0:
            print(f"   First contact keys: {list(data['contacts'][0].keys())}")

    async def test_sms_retrieval(self, client: AsyncClient):
        """Test retrieving SMS messages"""
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        response = await client.get(f"/api/extract/{job_id}/sms")
        assert response.status_code == 200
        data = response.json()
        
        assert "sms" in data
        assert "total" in data
        
        print(f"✅ SMS retrieved: {data['total']} messages")
        if data["total"] > 0:
            print(f"   First SMS keys: {list(data['sms'][0].keys())}")

    async def test_call_logs_retrieval(self, client: AsyncClient):
        """Test retrieving call logs"""
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        response = await client.get(f"/api/extract/{job_id}/call-logs")
        assert response.status_code == 200
        data = response.json()
        
        assert "call_logs" in data
        assert "total" in data
        
        print(f"✅ Call logs retrieved: {data['total']} calls")
        if data["total"] > 0:
            print(f"   First call log keys: {list(data['call_logs'][0].keys())}")

    async def test_media_retrieval(self, client: AsyncClient):
        """Test retrieving media files list"""
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        response = await client.get(f"/api/extract/{job_id}/media")
        assert response.status_code == 200
        data = response.json()
        
        assert "media" in data
        assert "total" in data
        
        print(f"✅ Media files retrieved: {data['total']} files")
        for i, media in enumerate(data["media"][:3]):  # Show first 3
            print(f"   {i+1}. {media['filename']} ({media['size']} bytes)")

    async def test_extraction_summary(self, client: AsyncClient):
        """Test retrieving extraction summary"""
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        response = await client.get(f"/api/extract/{job_id}/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "job_id" in data
        assert "created" in data
        assert "device_info" in data
        assert "artifacts" in data
        assert "files_count" in data
        assert "total_size" in data
        
        print(f"✅ Extraction summary retrieved")
        print(f"   Files: {data['files_count']}")
        print(f"   Total size: {data['total_size']} bytes")
        print(f"   Artifacts: {len(data['artifacts'])}")

    async def test_file_download_capabilities(self, client: AsyncClient):
        """Test file download endpoints"""
        extractions_response = await client.get("/api/extractions")
        extractions = extractions_response.json()["extractions"]
        completed_extractions = [e for e in extractions if e["status"] == "completed"]
        
        assert len(completed_extractions) > 0, "Need at least one completed extraction"
        job_id = completed_extractions[-1]["job_id"]
        
        # Test HTML report access
        response = await client.get(f"/api/extract/{job_id}/report")
        if response.status_code == 200:
            print("✅ HTML report accessible")
        
        # Test ZIP download
        response = await client.get(f"/api/extract/{job_id}/download")
        if response.status_code == 200:
            print("✅ ZIP download accessible")
        
        # Test media file access (if available)
        media_response = await client.get(f"/api/extract/{job_id}/media")
        media_data = media_response.json()
        if media_data["total"] > 0:
            first_media = media_data["media"][0]["filename"]
            file_response = await client.get(f"/api/extract/{job_id}/media/{first_media}")
            if file_response.status_code == 200:
                print(f"✅ Media file download accessible: {first_media}")

    async def test_storage_info(self, client: AsyncClient):
        """Test storage information endpoint"""
        response = await client.get("/api/system/storage")
        assert response.status_code == 200
        data = response.json()
        
        assert "total_extractions" in data
        assert "total_size" in data
        assert "available_space" in data
        
        print(f"✅ Storage info retrieved")
        print(f"   Total extractions: {data['total_extractions']}")
        print(f"   Total size: {data['total_size']} bytes")
        print(f"   Available space: {data['available_space']}")


# Integration test that runs the full workflow
async def test_full_extraction_workflow():
    """Integration test that runs the complete extraction workflow"""
    print("\n🔄 Starting full extraction workflow test...")
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        test_instance = TestDigitalForensicsAPI()
        
        # 1. Check health and device status
        await test_instance.test_health_check(client)
        await test_instance.test_device_status(client)
        
        # 2. Start extraction and wait for completion
        job_id = await test_instance.test_extraction_status_polling(client)
        
        # 3. Test all data retrieval endpoints
        await test_instance.test_device_info_retrieval(client)
        await test_instance.test_packages_retrieval(client)
        await test_instance.test_contacts_retrieval(client)
        await test_instance.test_sms_retrieval(client)
        await test_instance.test_call_logs_retrieval(client)
        await test_instance.test_media_retrieval(client)
        await test_instance.test_extraction_summary(client)
        
        # 4. Test file access
        await test_instance.test_file_download_capabilities(client)
        
        # 5. Test system endpoints
        await test_instance.test_storage_info(client)
        
        print(f"\n🎉 Full workflow test completed successfully!")
        print(f"   Job ID: {job_id}")


if __name__ == "__main__":
    # Run the integration test directly
    asyncio.run(test_full_extraction_workflow())