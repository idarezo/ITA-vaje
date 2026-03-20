#!/bin/bash
# Setup script for residents-service

echo "Setting up residents-service..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

# Generate proto files
echo "Generating proto files..."
python generate_proto.py

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure MySQL is running"
echo "2. Update .env file with your database credentials"
echo "3. Run: python main.py"
