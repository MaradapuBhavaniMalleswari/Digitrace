#!/usr/bin/env python3
"""
Startup script for the Digital Forensics FastAPI backend
"""

import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    import uvicorn
    
    print("Starting Digital Forensics API Server...")
    print("Server will be available at: http://localhost:8000")
    print("API documentation: http://localhost:8000/docs")
    print("Alternative docs: http://localhost:8000/redoc")
    print()
    
    uvicorn.run(
        "main:app",  # Use import string for reload to work
        host="0.0.0.0", 
        port=8000,
        reload=True,  # Enable auto-reload during development
        log_level="info"
    )