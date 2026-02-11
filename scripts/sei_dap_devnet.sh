#!/usr/bin/env bash
set -euo pipefail

NODES=4
PORT_BASE=30333
WS_BASE=9944

echo "🚀 Building Sei DAP node..."
go build ./cmd/sei-dap

for i in $(seq 0 $((NODES-1))); do
  ./sei-dap \
    -base-path "/tmp/sei-dap-node${i}" \
    -chain local \
    -port $((PORT_BASE + i)) \
    -ws-port $((WS_BASE + i)) \
    -validator \
    -name "SeiValidator-${i}" &
done

wait
