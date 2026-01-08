@echo off
echo ========================================
echo   DermaScope Backend Server Launcher
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

echo Python detected!
echo.

REM Check if model file exists
if not exist "my_skin_disease_model.pth" (
    echo ERROR: Model file not found!
    echo Please ensure 'my_skin_disease_model.pth' is in the same directory
    pause
    exit /b 1
)

echo Model file found!
echo.

REM Check if requirements are installed
echo Checking dependencies...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

REM Create uploads folder if it doesn't exist
if not exist "uploads" mkdir uploads

echo Starting server...
echo.
echo Server will be available at: http://localhost:5000
echo Press CTRL+C to stop the server
echo.
echo ========================================
echo.

python app.py

pause
