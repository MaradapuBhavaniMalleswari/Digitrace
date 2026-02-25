#!/usr/bin/env python3
"""
Test the complete extraction workflow
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the main module
import main

async def test_extraction_workflow():
    print("🧪 Testing Complete Extraction Workflow")
    print("=" * 50)
    
    # Generate a test job ID
    job_id = str(uuid.uuid4())
    case_name = "test_workflow"
    
    # Initialize job tracking (same as API does)
    main.extraction_jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "progress": 0,
        "message": "Test extraction queued",
        "created_at": datetime.now().isoformat(),
        "completed_at": None,
        "export_dir": None,
        "error": None
    }
    
    print(f"Job ID: {job_id}")
    print(f"Case name: {case_name}")
    print()
    
    # Run the extraction process
    print("Starting extraction process...")
    await main.run_extraction_process(job_id, case_name)
    
    # Check final status
    final_status = main.extraction_jobs[job_id]
    print(f"\nFinal Status: {final_status['status']}")
    print(f"Progress: {final_status['progress']}%")
    print(f"Message: {final_status['message']}")
    
    if final_status['status'] == 'completed':
        print(f"✅ Extraction completed successfully!")
        print(f"Export directory: {final_status.get('export_dir', 'Unknown')}")
        print(f"ZIP file: {final_status.get('zip_file', 'Unknown')}")
        return True
    else:
        print(f"❌ Extraction failed!")
        print(f"Error: {final_status.get('error', 'Unknown error')}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(test_extraction_workflow())
        input(f"\nTest {'PASSED' if success else 'FAILED'}. Press Enter to exit...")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
        import traceback
        traceback.print_exc()
        input("Press Enter to exit...")
        sys.exit(1)