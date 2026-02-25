@echo off
echo Digital Forensics API Test Runner
echo ================================

echo.
echo Installing/Updating dependencies...
pip install -r requirements.txt

echo.
echo Starting API server in background...
start "API Server" python run_server.py

echo.
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Running extraction tests...
python test_extraction.py

echo.
echo Tests completed! Check the output above for results.
pause