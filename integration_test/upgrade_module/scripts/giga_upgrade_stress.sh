#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
E2E_SCRIPT="${ROOT_DIR}/integration_test/upgrade_module/scripts/giga_upgrade_e2e.sh"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--iterations <n>] [--versions <csv>] [--dry-run]

Stress-runs Sei giga upgrade e2e repeatedly.
USAGE
}

ITERATIONS=3
VERSIONS=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --iterations)
      ITERATIONS="${2:-}"
      shift 2
      ;;
    --versions)
      VERSIONS="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [[ "$ITERATIONS" -lt 1 ]]; then
  echo "--iterations must be a positive integer" >&2
  exit 1
fi

PASSED=0
for i in $(seq 1 "$ITERATIONS"); do
  echo "######## stress iteration ${i}/${ITERATIONS} ########"

  EXTRA_ARGS=(--repeat 1)
  if [[ -n "$VERSIONS" ]]; then
    EXTRA_ARGS+=(--versions "$VERSIONS")
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    EXTRA_ARGS+=(--dry-run)
  fi

  if "$E2E_SCRIPT" "${EXTRA_ARGS[@]}"; then
    PASSED=$((PASSED + 1))
    echo "iteration ${i} passed"
  else
    echo "iteration ${i} failed" >&2
    exit 1
  fi
done

echo "stress complete: ${PASSED}/${ITERATIONS} iterations passed"
