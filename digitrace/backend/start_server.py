#!/usr/bin/env python3
"""
Simple server startup without reload - for testing
"""

if __name__ == "__main__":
    import uvicorn
    from main import app
    
    print("🚀 Starting Digital Forensics API Server...")
    print("📡 Server: http://localhost:8001")
    print("📚 Docs: http://localhost:8001/docs")
    print("🔧 Ready for testing!")
    print("-" * 50)
    
    uvicorn.run(
        app,
        host="0.0.0.0", 
        port=8001,
        timeout_keep_alive=3600,  # 1 hour keep-alive for long extractions
        timeout_graceful_shutdown=30,
        log_level="info"
    )