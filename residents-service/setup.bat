@echo off
REM Setup script for residents-service (Windows)

echo Setting up residents-service...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed
    exit /b 1
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install requirements
echo Installing requirements...
pip install -r requirements.txt

REM Generate proto files
echo Generating proto files...
python generate_proto.py

echo Setup complete!
echo.
echo Next steps:
echo 1. Make sure MySQL is running
echo 2. Update .env file with your database credentials
echo 3. Run: python main.py
