@echo off
REM =============================================================================
REM DicomPrintSCP OCR Setup Script
REM Installs and verifies Tesseract OCR for patient info extraction
REM =============================================================================

echo.
echo ========================================================================
echo  DicomPrintSCP - OCR Patient Info Extraction Setup
echo ========================================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] Not running as administrator.
    echo Tesseract installation may fail if not in user-writable location.
    echo.
    echo Right-click this script and select "Run as administrator" for best results.
    echo.
    pause
)

REM Check if Tesseract is already installed
echo [1/4] Checking for existing Tesseract installation...
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo       Found: C:\Program Files\Tesseract-OCR\tesseract.exe
    set TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
    goto :verify_python
) else if exist "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe" (
    echo       Found: C:\Program Files (x86)\Tesseract-OCR\tesseract.exe
    set TESSERACT_PATH=C:\Program Files (x86)\Tesseract-OCR\tesseract.exe
    goto :verify_python
) else (
    echo       Not found.
)

REM Check if installer exists
echo.
echo [2/4] Looking for Tesseract installer...
set INSTALLER=%~dp0tesseract-ocr-w64-setup-5.4.0.20240606.exe
if exist "%INSTALLER%" (
    echo       Found: %INSTALLER%
    goto :install_tesseract
) else (
    echo       Installer not found in script directory.
    echo.
    echo       Please download Tesseract OCR from:
    echo       https://github.com/UB-Mannheim/tesseract/releases
    echo.
    echo       Download: tesseract-ocr-w64-setup-5.4.0.20240606.exe
    echo       Place it in: %~dp0
    echo       Then run this script again.
    echo.
    pause
    exit /b 1
)

:install_tesseract
echo.
echo [3/4] Installing Tesseract OCR...
echo       This may take 1-2 minutes...
echo.
echo       During installation:
echo       - Install to: C:\Program Files\Tesseract-OCR (default)
echo       - Select language data: English (required)
echo       - Additional scripts: Optional
echo.
"%INSTALLER%" /S /D=C:\Program Files\Tesseract-OCR
if %errorLevel% neq 0 (
    echo.
    echo [ERROR] Installation failed. Try running as administrator.
    pause
    exit /b 1
)
set TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
echo       Installation complete.

:verify_python
echo.
echo [4/4] Verifying Python OCR libraries...
python -c "import pytesseract; import pymupdf; from PIL import Image; print('       All libraries OK')" 2>nul
if %errorLevel% neq 0 (
    echo       Installing required Python packages...
    pip install pytesseract pymupdf Pillow easyocr pdf2image --quiet
    if %errorLevel% neq 0 (
        echo.
        echo [ERROR] Failed to install Python packages.
        echo         Please run: pip install pytesseract pymupdf Pillow easyocr pdf2image
        pause
        exit /b 1
    )
    echo       Python packages installed.
) else (
    echo       Python libraries already installed.
)

REM Test OCR
echo.
echo ========================================================================
echo  Testing OCR Extraction
echo ========================================================================
echo.

set TEST_SCRIPT=%~dp0test_ocr_simple.py
if not exist "%TEST_SCRIPT%" (
    echo [WARNING] Test script not found: %TEST_SCRIPT%
    echo.
    echo OCR setup complete, but cannot run test.
    echo You can manually test by running a print job from the X-ray console.
    echo.
    pause
    exit /b 0
)

python "%TEST_SCRIPT%" "%TESSERACT_PATH%"
if %errorLevel% neq 0 (
    echo.
    echo [WARNING] OCR test failed.
    echo           Tesseract may not be properly configured.
    echo.
    echo You can still use the system - OCR will attempt to run on each print job.
    echo Check server logs for OCR errors.
) else (
    echo.
    echo ========================================================================
    echo  OCR Setup Complete!
    echo ========================================================================
    echo.
    echo Patient info extraction is now enabled.
    echo.
    echo Next steps:
    echo 1. Restart DicomPrintSCP server
    echo 2. Send a print job from X-ray console
    echo 3. Check server log for "OCR extracted:" messages
    echo 4. Verify Orthanc receives studies with patient tags
    echo.
)

pause
