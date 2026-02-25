# Digital Forensics Backend API

A FastAPI-based backend for Android device forensic data extraction using ADB.

## Features

- **Device Connection**: Check ADB device connection status
- **Data Extraction**: Trigger comprehensive forensic data extraction
- **Progress Tracking**: Real-time status and progress monitoring
- **Data Retrieval**: Access extracted data through REST APIs
- **File Serving**: Download extracted files, media, and reports
- **Management**: Manage extraction jobs and system storage

## Prerequisites

1. **Python 3.7+** installed
2. **ADB (Android Debug Bridge)** installed and in PATH
3. **Android device** connected via USB with:
   - USB Debugging enabled
   - Computer authorized on device

## Installation

1. Install Python dependencies:
```powershell
pip install -r requirements.txt
```

2. Verify ADB connection:
```powershell
adb devices
```

## Running the Server

### Option 1: Using the startup script
```powershell
python run_server.py
```

### Option 2: Using uvicorn directly
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server will be available at:
- **API Server**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Health Check
- `GET /` - Basic status
- `GET /health` - Health check with ADB status
- `GET /api/device/status` - Device connection status

### Extraction Management
- `POST /api/extract` - Start new extraction
- `GET /api/extract/{job_id}/status` - Get extraction status
- `GET /api/extractions` - List all extractions
- `DELETE /api/extract/{job_id}` - Delete extraction

### Data Retrieval
- `GET /api/extract/{job_id}/device-info` - Device information
- `GET /api/extract/{job_id}/packages` - Installed packages
- `GET /api/extract/{job_id}/contacts` - Contacts
- `GET /api/extract/{job_id}/sms` - SMS messages
- `GET /api/extract/{job_id}/call-logs` - Call history
- `GET /api/extract/{job_id}/media` - Media files list
- `GET /api/extract/{job_id}/summary` - Extraction summary

### File Access
- `GET /api/extract/{job_id}/media/{filename}` - Download media file
- `GET /api/extract/{job_id}/files/{filepath}` - Download any file
- `GET /api/extract/{job_id}/download` - Download complete ZIP
- `GET /api/extract/{job_id}/report` - View HTML report

### System Management
- `GET /api/system/storage` - Storage information
- `POST /api/system/cleanup` - Clean old extractions

## Usage Example

1. **Start an extraction**:
```bash
curl -X POST "http://localhost:8000/api/extract" \
     -H "Content-Type: application/json" \
     -d '{"case_name": "my_case"}'
```

2. **Check status**:
```bash
curl "http://localhost:8000/api/extract/{job_id}/status"
```

3. **Get extracted data**:
```bash
curl "http://localhost:8000/api/extract/{job_id}/device-info"
```

## File Structure

```
backend/
├── main.py              # FastAPI application
├── adb.py              # ADB extraction logic
├── run_server.py       # Server startup script
├── requirements.txt    # Python dependencies
└── exports/           # Extraction output directory
    └── {timestamp}_{case_name}/
        ├── device_info.json
        ├── packages.json
        ├── contacts.json
        ├── sms.json
        ├── call_log.json
        ├── media/
        ├── logcat.txt
        ├── bugreport.zip
        ├── manifest.json
        └── index.html
```

## Development

The server runs with auto-reload enabled for development. Any changes to the code will automatically restart the server.

## Security Notes

- This tool is intended for legal forensic analysis only
- Ensure proper authorization before accessing device data
- The API currently has basic security - add authentication for production use
- File serving endpoints include path traversal protection

## Troubleshooting

1. **"No ADB devices found"**: 
   - Check USB connection
   - Enable USB Debugging on device
   - Authorize computer on device
   - Run `adb devices` to verify

2. **Permission errors during extraction**:
   - Some data requires root access
   - Non-rooted devices have limited data access
   - Check device permissions for the data being accessed

3. **Server won't start**:
   - Check if port 8000 is available
   - Verify Python dependencies are installed
   - Check Python version (3.7+ required)