#!/bin/bash
# Script to run cloc on the codebase with standard exclusions.

echo "=== Counting only TypeScript (TS/TSX) and Python files ==="
cloc --exclude-dir=node_modules,.next,.venv,venv,.git,__pycache__ --by-file --include-ext=ts,tsx,py .
