#!/usr/bin/env python3
"""
FastAPI Backend for Digital Forensics Tool
Provides APIs for ADB extraction and data retrieval
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Response, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
import logging
import asyncio
import uuid
import time
from datetime import datetime
from pathlib import Path
import mimetypes

# Import our existing extraction script
import adb

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app instance
app = FastAPI(
    title="Digital Forensics API",
    description="API for Android device forensic data extraction using ADB",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for tracking extractions
extraction_jobs = {}

# Pydantic models
class ExtractionRequest(BaseModel):
    device_id: Optional[str] = None
    case_name: Optional[str] = "case"

class ExtractionStatus(BaseModel):
    job_id: str
    status: str  # "pending", "running", "completed", "failed"
    progress: int
    message: str
    created_at: str
    completed_at: Optional[str] = None
    export_dir: Optional[str] = None
    error: Optional[str] = None

class DeviceInfo(BaseModel):
    manufacturer: str
    model: str
    android_version: str
    serial_number: str
    build_info: Dict[str, Any]

class ExtractionSummary(BaseModel):
    job_id: str
    created: str
    device_info: Dict[str, Any]
    artifacts: List[tuple]
    files_count: int
    total_size: int

# Helper functions
def get_extraction_dir(job_id: str) -> str:
    """Get the extraction directory for a job"""
    exports_dir = os.path.join(os.path.dirname(__file__), "exports")
    # Look for directories containing the job_id
    for dirname in os.listdir(exports_dir):
        if job_id in dirname:
            return os.path.join(exports_dir, dirname)
    return None

def calculate_directory_size(directory: str) -> int:
    """Calculate total size of all files in directory"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(directory):
        for filename in filenames:
            filepath = os.path.join(dirpath, filename)
            try:
                total_size += os.path.getsize(filepath)
            except (OSError, IOError):
                pass
    return total_size

async def run_extraction_process(job_id: str, case_name: str = "case"):
    """Background task to run the extraction process"""
    try:
        logger.info(f"Starting extraction job {job_id}")
        extraction_jobs[job_id]["status"] = "running"
        extraction_jobs[job_id]["progress"] = 10
        extraction_jobs[job_id]["message"] = "Starting ADB extraction..."
        
        # Check ADB connection first
        is_connected, message = adb.check_adb_connection()
        if not is_connected:
            extraction_jobs[job_id]["status"] = "failed"
            extraction_jobs[job_id]["error"] = message
            logger.error(f"ADB connection failed for job {job_id}: {message}")
            return
        
        logger.info(f"ADB connection verified for job {job_id}: {message}")
        extraction_jobs[job_id]["progress"] = 20
        extraction_jobs[job_id]["message"] = "Creating export directory..."
        
        # Create export directory
        outdir = adb.make_export_dir(case_name)
        extraction_jobs[job_id]["export_dir"] = outdir
        extraction_jobs[job_id]["progress"] = 30
        
        # Collect device info
        extraction_jobs[job_id]["message"] = "Collecting device information..."
        device_info = adb.collect_getprop(outdir)
        extraction_jobs[job_id]["progress"] = 40
        
        # Collect packages
        extraction_jobs[job_id]["message"] = "Collecting installed packages..."
        packages = adb.collect_packages(outdir)
        extraction_jobs[job_id]["progress"] = 50
        
        # Collect bugreport
        extraction_jobs[job_id]["message"] = "Collecting bugreport..."
        bugreport = adb.collect_bugreport(outdir)
        extraction_jobs[job_id]["progress"] = 60
        
        # Collect logcat
        extraction_jobs[job_id]["message"] = "Collecting logcat..."
        logcat = adb.collect_logcat(outdir)
        extraction_jobs[job_id]["progress"] = 70
        
        # Collect content provider data
        extraction_jobs[job_id]["message"] = "Collecting SMS, calls, contacts..."
        content_queries = [
            ("content://sms", "sms"),
            ("content://call_log/calls", "call_log"),
            ("content://contacts/phones", "contacts")
        ]
        for uri, name in content_queries:
            adb.try_content_query(uri, outdir, name)
        extraction_jobs[job_id]["progress"] = 80
        
        # Collect media files
        extraction_jobs[job_id]["message"] = "Collecting recent media files..."
        pulled_media, listfile = adb.list_and_pull_recent_media(outdir)
        extraction_jobs[job_id]["progress"] = 90
        
        # Collect app data
        extraction_jobs[job_id]["message"] = "Collecting app external data..."
        for pkg in adb.APP_EXAMPLE_PACKAGES:
            adb.pull_app_external(pkg, outdir)
        
        # Create manifest and index
        extraction_jobs[job_id]["message"] = "Finalizing extraction..."
        manifest = []
        all_files = []
        for dirpath, _, filenames in os.walk(outdir):
            for filename in filenames:
                filepath = os.path.join(dirpath, filename)
                manifest.append({
                    "path": os.path.relpath(filepath, outdir),
                    "size": os.path.getsize(filepath)
                })
                all_files.append(filepath)
        
        adb.save_json(os.path.join(outdir, "manifest.json"), manifest)
        
        # Create summary
        summary = {
            "created": datetime.now().isoformat(),
            "device_info": device_info,
            "artifacts": [
                ("device_info.json", "Device metadata"),
                ("packages.json", f"{len(packages)} packages"),
                ("bugreport", "Device bugreport"),
                ("logcat.txt", "System logs"),
                ("sms.json", "SMS messages"),
                ("call_log.json", "Call history"),
                ("contacts.json", "Contacts"),
                ("media/", f"{len(pulled_media)} media files"),
            ],
            "files": all_files
        }
        
        # Create HTML index
        adb.make_index_html(outdir, summary)
        
        # Create ZIP archive
        zipfile, hash_value = adb.zip_and_hash(outdir)
        
        # Update job status
        extraction_jobs[job_id]["status"] = "completed"
        extraction_jobs[job_id]["progress"] = 100
        extraction_jobs[job_id]["message"] = "Extraction completed successfully"
        extraction_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        extraction_jobs[job_id]["zip_file"] = zipfile
        extraction_jobs[job_id]["hash"] = hash_value
        
        logger.info(f"Extraction {job_id} completed successfully")
        
    except Exception as e:
        extraction_jobs[job_id]["status"] = "failed"
        extraction_jobs[job_id]["error"] = str(e)
        extraction_jobs[job_id]["message"] = f"Extraction failed: {str(e)}"
        extraction_jobs[job_id]["completed_at"] = datetime.now().isoformat()
        logger.error(f"Extraction {job_id} failed: {str(e)}", exc_info=True)

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "Digital Forensics API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check if ADB is available
    try:
        rc, out, err = adb.run(["adb", "version"])
        adb_status = "available" if rc == 0 else "unavailable"
    except:
        adb_status = "unavailable"
    
    return {
        "status": "healthy",
        "adb_status": adb_status,
        "timestamp": datetime.now().isoformat()
    }

# Extraction endpoints
@app.post("/api/extract", response_model=dict)
async def start_extraction(request: ExtractionRequest, background_tasks: BackgroundTasks):
    """Start a new ADB extraction process"""
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    
    # Initialize job tracking
    extraction_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "message": "Extraction queued",
        "created_at": datetime.now().isoformat(),
        "completed_at": None,
        "export_dir": None,
        "error": None
    }
    
    # Start background extraction
    background_tasks.add_task(run_extraction_process, job_id, request.case_name)
    
    return {
        "job_id": job_id,
        "message": "Extraction started",
        "status": "pending"
    }

@app.get("/api/extract/{job_id}/status", response_model=ExtractionStatus)
async def get_extraction_status(job_id: str):
    """Get the status of an extraction job"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    job_data = extraction_jobs[job_id]
    return ExtractionStatus(**job_data)

@app.get("/api/extractions")
async def list_extractions():
    """List all extraction jobs"""
    return {
        "extractions": list(extraction_jobs.values()),
        "total": len(extraction_jobs)
    }

# Data retrieval endpoints
@app.get("/api/extract/{job_id}/device-info")
async def get_device_info(job_id: str):
    """Get device information from extraction"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    device_info_path = os.path.join(export_dir, "device_info.json")
    if not os.path.exists(device_info_path):
        raise HTTPException(status_code=404, detail="Device info not found")
    
    with open(device_info_path, 'r', encoding='utf-8') as f:
        device_info = json.load(f)
    
    return {"device_info": device_info}

@app.get("/api/extract/{job_id}/packages")
async def get_packages(job_id: str):
    """Get installed packages from extraction"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    packages_path = os.path.join(export_dir, "packages.json")
    if not os.path.exists(packages_path):
        raise HTTPException(status_code=404, detail="Packages info not found")
    
    with open(packages_path, 'r', encoding='utf-8') as f:
        packages = json.load(f)
    
    return {"packages": packages, "total": len(packages)}

@app.get("/api/extract/{job_id}/contacts")
async def get_contacts(job_id: str):
    """Get contacts from extraction"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    contacts_path = os.path.join(export_dir, "contacts.json")
    if not os.path.exists(contacts_path):
        return {"contacts": [], "total": 0, "message": "No contacts data available"}
    
    with open(contacts_path, 'r', encoding='utf-8') as f:
        contacts = json.load(f)
    
    return {"contacts": contacts, "total": len(contacts)}

@app.get("/api/extract/{job_id}/sms")
async def get_sms(job_id: str):
    """Get SMS messages from extraction"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    sms_path = os.path.join(export_dir, "sms.json")
    if not os.path.exists(sms_path):
        return {"sms": [], "total": 0, "message": "No SMS data available"}
    
    with open(sms_path, 'r', encoding='utf-8') as f:
        sms_data = json.load(f)
    
    return {"sms": sms_data, "total": len(sms_data)}

@app.get("/api/extract/{job_id}/call-logs")
async def get_call_logs(job_id: str):
    """Get call logs from extraction"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    call_log_path = os.path.join(export_dir, "call_log.json")
    if not os.path.exists(call_log_path):
        return {"call_logs": [], "total": 0, "message": "No call log data available"}
    
    with open(call_log_path, 'r', encoding='utf-8') as f:
        call_logs = json.load(f)
    
    return {"call_logs": call_logs, "total": len(call_logs)}

@app.get("/api/extract/{job_id}/media")
async def get_media_list(job_id: str):
    """Get list of extracted media files"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    media_dir = os.path.join(export_dir, "media")
    if not os.path.exists(media_dir):
        return {"media": [], "total": 0, "message": "No media files available"}
    
    media_files = []
    for filename in os.listdir(media_dir):
        filepath = os.path.join(media_dir, filename)
        if os.path.isfile(filepath):
            media_files.append({
                "filename": filename,
                "size": os.path.getsize(filepath),
                "path": f"/api/extract/{job_id}/media/{filename}"
            })
    
    return {"media": media_files, "total": len(media_files)}

@app.get("/api/extract/{job_id}/summary")
async def get_extraction_summary(job_id: str):
    """Get extraction summary"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    # Read manifest if available
    manifest_path = os.path.join(export_dir, "manifest.json")
    manifest = []
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    
    # Calculate stats
    total_files = len(manifest)
    total_size = sum(item.get("size", 0) for item in manifest)
    
    # Get device info
    device_info = {}
    device_info_path = os.path.join(export_dir, "device_info.json")
    if os.path.exists(device_info_path):
        with open(device_info_path, 'r', encoding='utf-8') as f:
            device_info = json.load(f)
    
    return {
        "job_id": job_id,
        "created": extraction_jobs[job_id]["created_at"],
        "device_info": device_info,
        "artifacts": [
            ("Device Info", "System properties and configuration"),
            ("Packages", "Installed applications"),
            ("Contacts", "Contact information"),
            ("SMS", "Text messages"),
            ("Call Logs", "Call history"),
            ("Media", "Photos and videos"),
            ("Logcat", "System logs"),
            ("Bugreport", "System diagnostic report")
        ],
        "files_count": total_files,
        "total_size": total_size,
        "hash": extraction_jobs[job_id].get("hash", None),
        "zip_file": extraction_jobs[job_id].get("zip_file", None)
    }

# File serving endpoints
@app.get("/api/extract/{job_id}/media/{filename}")
async def get_media_file(job_id: str, filename: str):
    """Serve a specific media file"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    media_path = os.path.join(export_dir, "media", filename)
    if not os.path.exists(media_path):
        raise HTTPException(status_code=404, detail="Media file not found")
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(media_path)
    if mime_type is None:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        path=media_path,
        media_type=mime_type,
        filename=filename
    )

@app.get("/api/extract/{job_id}/files/{filepath:path}")
async def get_extraction_file(job_id: str, filepath: str):
    """Serve any file from the extraction directory"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    # Sanitize the file path to prevent directory traversal
    safe_path = os.path.normpath(filepath).lstrip(os.sep)
    full_path = os.path.join(export_dir, safe_path)
    
    # Ensure the file is within the export directory
    if not full_path.startswith(os.path.abspath(export_dir)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get MIME type
    mime_type, _ = mimetypes.guess_type(full_path)
    if mime_type is None:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        path=full_path,
        media_type=mime_type,
        filename=os.path.basename(full_path)
    )

@app.get("/api/extract/{job_id}/download")
async def download_extraction_zip(job_id: str):
    """Download the complete extraction as a ZIP file"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    job_data = extraction_jobs[job_id]
    if job_data["status"] != "completed":
        raise HTTPException(status_code=400, detail="Extraction not completed")
    
    zip_file = job_data.get("zip_file")
    if not zip_file or not os.path.exists(zip_file):
        raise HTTPException(status_code=404, detail="ZIP file not found")
    
    return FileResponse(
        path=zip_file,
        media_type="application/zip",
        filename=os.path.basename(zip_file)
    )

@app.get("/api/extract/{job_id}/report")
async def get_html_report(job_id: str):
    """Serve the HTML report"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    export_dir = extraction_jobs[job_id].get("export_dir")
    if not export_dir:
        raise HTTPException(status_code=400, detail="Extraction not completed or failed")
    
    index_path = os.path.join(export_dir, "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="HTML report not found")
    
    return FileResponse(
        path=index_path,
        media_type="text/html"
    )

# Management endpoints
@app.delete("/api/extract/{job_id}")
async def delete_extraction(job_id: str):
    """Delete an extraction job and its files"""
    if job_id not in extraction_jobs:
        raise HTTPException(status_code=404, detail="Extraction job not found")
    
    job_data = extraction_jobs[job_id]
    export_dir = job_data.get("export_dir")
    
    # Clean up files
    if export_dir and os.path.exists(export_dir):
        import shutil
        shutil.rmtree(export_dir, ignore_errors=True)
    
    # Clean up ZIP file
    zip_file = job_data.get("zip_file")
    if zip_file and os.path.exists(zip_file):
        try:
            os.remove(zip_file)
        except OSError:
            pass
    
    # Remove from tracking
    del extraction_jobs[job_id]
    
    return {"message": "Extraction deleted successfully"}

@app.get("/api/system/storage")
async def get_storage_info():
    """Get storage information about extractions"""
    exports_dir = os.path.join(os.path.dirname(__file__), "exports")
    
    if not os.path.exists(exports_dir):
        return {
            "total_extractions": 0,
            "total_size": 0,
            "available_space": "Unknown"
        }
    
    total_size = 0
    extraction_count = 0
    
    for dirname in os.listdir(exports_dir):
        dirpath = os.path.join(exports_dir, dirname)
        if os.path.isdir(dirpath):
            extraction_count += 1
            total_size += calculate_directory_size(dirpath)
    
    # Get available disk space
    try:
        import shutil
        _, _, free_space = shutil.disk_usage(exports_dir)
    except:
        free_space = "Unknown"
    
    return {
        "total_extractions": extraction_count,
        "total_size": total_size,
        "available_space": free_space,
        "exports_directory": exports_dir
    }

@app.post("/api/system/cleanup")
async def cleanup_old_extractions():
    """Clean up old extraction files"""
    exports_dir = os.path.join(os.path.dirname(__file__), "exports")
    
    if not os.path.exists(exports_dir):
        return {"message": "No exports directory found", "cleaned": 0}
    
    cleaned_count = 0
    for dirname in os.listdir(exports_dir):
        dirpath = os.path.join(exports_dir, dirname)
        if os.path.isdir(dirpath):
            try:
                # Check if this extraction is still tracked
                job_id_found = False
                for job_id, job_data in extraction_jobs.items():
                    if job_data.get("export_dir") == dirpath:
                        job_id_found = True
                        break
                
                # If not tracked and older than 24 hours, clean it up
                if not job_id_found:
                    dir_age = time.time() - os.path.getctime(dirpath)
                    if dir_age > 86400:  # 24 hours
                        import shutil
                        shutil.rmtree(dirpath, ignore_errors=True)
                        cleaned_count += 1
            except:
                continue
    
    return {"message": f"Cleaned up {cleaned_count} old extractions", "cleaned": cleaned_count}

@app.get("/api/device/status")
async def get_device_status():
    """Check ADB device connection status"""
    try:
        rc, out, err = adb.run(["adb", "devices"])
        if rc != 0:
            return {"connected": False, "error": "ADB not working", "details": err}
        
        lines = out.splitlines()
        devices = []
        for line in lines[1:]:
            if line.strip() and "\t" in line:
                serial, status = line.strip().split("\t", 1)
                devices.append({"serial": serial, "status": status})
        
        connected_devices = [d for d in devices if d["status"] == "device"]
        
        return {
            "connected": len(connected_devices) > 0,
            "devices": devices,
            "connected_devices": connected_devices
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)