#!/bin/bash
set -euo pipefail

echo "Checking RAM..."
free -g | awk '/Mem:/ { if ($2 < 256) exit 1 }'

echo "Checking CPU cores..."
cores=$(nproc)
if [ "$cores" -lt 16 ]; then
    echo "Insufficient CPU cores"
    exit 1
fi

echo "Node meets Giga minimum requirements."
