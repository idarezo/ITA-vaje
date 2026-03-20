#!/usr/bin/env python3
"""
Script to generate gRPC Python code from proto files
Run this from the residents-service directory:
    python generate_proto.py
"""

import subprocess
import sys
import os

def generate_proto():
    """Generate Python code from proto files"""
    proto_file = "residents.proto"
    
    if not os.path.exists(proto_file):
        print(f"Error: {proto_file} not found")
        sys.exit(1)
    
    try:
        # Generate Python code from proto
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "grpc_tools.protoc",
                f"-I.",
                f"--python_out=.",
                f"--grpc_python_out=.",
                proto_file,
            ],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__)) or "."
        )
        
        if result.returncode != 0:
            print("Error generating proto:")
            print(result.stderr)
            sys.exit(1)
        
        print(f"Successfully generated Python code from {proto_file}")
        print("Generated files:")
        print("  - residents_pb2.py")
        print("  - residents_pb2_grpc.py")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    generate_proto()
