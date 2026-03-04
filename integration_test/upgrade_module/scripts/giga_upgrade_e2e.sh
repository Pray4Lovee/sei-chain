#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
RUNNER="python3 ${ROOT_DIR}/integration_test/scripts/runner.py"
START_SCRIPT="${ROOT_DIR}/integration_test/upgrade_module/scripts/launch_cluster.sh"
MINOR_TEST="${ROOT_DIR}/integration_test/upgrade_module/minor_upgrade_test.yaml"
MAJOR_TEST="${ROOT_DIR}/integration_test/upgrade_module/major_upgrade_test.yaml"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--versions <csv>] [--repeat <n>] [--skip-launch] [--dry-run]

Runs the full Sei giga upgrade e2e flow (minor + major upgrade integration tests).

Options:
  --versions <csv>   Initial UPGRADE_VERSION_LIST for cluster launch.
  --repeat <n>       Number of times to execute minor+major sequence (default: 1).
  --skip-launch      Assume cluster is already running.
  --dry-run          Print actions without executing heavy commands.
  -h, --help         Show this help.
USAGE
}

VERSIONS=""
REPEAT=1
SKIP_LAUNCH=0
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --versions)
      VERSIONS="${2:-}"
      shift 2
      ;;
    --repeat)
      REPEAT="${2:-}"
      shift 2
      ;;
    --skip-launch)
      SKIP_LAUNCH=1
      shift
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

if ! [[ "$REPEAT" =~ ^[0-9]+$ ]] || [[ "$REPEAT" -lt 1 ]]; then
  echo "--repeat must be a positive integer" >&2
  exit 1
fi

run_cmd() {
  echo ">>> $*"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    "$@"
  fi
}

if [[ "$SKIP_LAUNCH" -eq 0 ]]; then
  if [[ -n "$VERSIONS" ]]; then
    run_cmd "$START_SCRIPT" "$VERSIONS"
  else
    run_cmd "$START_SCRIPT"
  fi
fi

for i in $(seq 1 "$REPEAT"); do
  echo "=== giga upgrade iteration ${i}/${REPEAT}: minor upgrade ==="
  run_cmd bash -lc "$RUNNER '$MINOR_TEST'"

  echo "=== giga upgrade iteration ${i}/${REPEAT}: major upgrade ==="
  run_cmd bash -lc "$RUNNER '$MAJOR_TEST'"
done

echo "giga upgrade e2e completed successfully"
