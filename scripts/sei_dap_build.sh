#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Building Sei DAP runtime scaffolds..."
go build -o ./sei-dap ./cmd/sei-dap
go build -o ./sei-soulproof ./cmd/sei-soulproof

echo "✅ Built binaries: ./sei-dap and ./sei-soulproof"
