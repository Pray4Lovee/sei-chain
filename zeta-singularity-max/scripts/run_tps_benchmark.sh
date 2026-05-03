#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TX_COUNT="${TX_COUNT:-65536}"
LABEL="${LABEL:-Sei-Giga SIP-3 dress rehearsal}"
OUTPUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/artifacts}"

mkdir -p "$OUTPUT_DIR"
cd "$ROOT_DIR"

rm -rf target
RUSTFLAGS="${RUSTFLAGS:--C target-cpu=native}" cargo build --release
./target/release/zeta-omega-infinity --tx-count "$TX_COUNT" --label "$LABEL" > "$OUTPUT_DIR/latest-performance.txt"
./target/release/zeta-omega-infinity --tx-count "$TX_COUNT" --label "$LABEL" --json > "$OUTPUT_DIR/latest-performance.json"
./target/release/zeta-omega-infinity --tx-count "$TX_COUNT" --label "$LABEL" --markdown > "$OUTPUT_DIR/latest-performance.md"

printf 'Wrote benchmark outputs to %s\n' "$OUTPUT_DIR"
