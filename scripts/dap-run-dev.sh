#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Building seid (Sei native node)"
make build

echo "🌀 Starting local Sei node with DAP scaffold context"
./build/seid start --home ./build/dap-dev --log_level info
