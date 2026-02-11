#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Building Sei DAP node..."
go build ./cmd/sei-dap

echo "🌀 Launching local Sei DAP node scaffold..."
./sei-dap \
  -dev \
  -chain local \
  -execution native \
  -rpc-cors all \
  -name "sei-dap-dev-node"
