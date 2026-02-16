#!/usr/bin/env bash
set -euo pipefail

EXTRINSIC=${1:-tx}
PRE=${2:-pre}
POST=${3:-post}

echo "🔐 DAP zk placeholder receipt"
go test ./x/dap/... -run TestPipelineExecuteSuccess -count=1 >/dev/null
echo "inputs: extrinsic=${EXTRINSIC} pre=${PRE} post=${POST}"
