#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Building Sei DAP runtime scaffolds..."
go build ./cmd/sei-dap ./cmd/sei-soulproof

echo "✅ Built binaries: ./sei-dap and ./sei-soulproof"
