#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[dap] running package tests"
go test ./dap/...

echo "[dap] running e2e race tests"
go test -race ./dap/e2e

echo "[dap] running e2e stress test only"
go test ./dap/e2e -run TestSovereignThroughputBatchFlow -count=1
