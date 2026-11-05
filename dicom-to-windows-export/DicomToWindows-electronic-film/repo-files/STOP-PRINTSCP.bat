@echo off
REM Stop all DicomPrintSCP server instances
REM Kill all python.exe processes (server runs as python server.py)

echo Stopping all DicomPrintSCP instances...

REM Method 1: Kill by process name
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM pythonw.exe >nul 2>&1

REM Method 2: Kill by port (in case method 1 fails)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":104.*LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8092.*LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)

echo DicomPrintSCP stopped.
timeout /t 2 >nul
