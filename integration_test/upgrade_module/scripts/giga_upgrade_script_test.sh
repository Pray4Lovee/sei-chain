#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
E2E_SCRIPT="${ROOT_DIR}/integration_test/upgrade_module/scripts/giga_upgrade_e2e.sh"
STRESS_SCRIPT="${ROOT_DIR}/integration_test/upgrade_module/scripts/giga_upgrade_stress.sh"

# 1) syntax check
bash -n "$E2E_SCRIPT"
bash -n "$STRESS_SCRIPT"

# 2) dry run should succeed quickly
"$E2E_SCRIPT" --dry-run --repeat 2 --skip-launch
"$STRESS_SCRIPT" --dry-run --iterations 2

# 3) invalid args should fail
if "$E2E_SCRIPT" --repeat 0 >/dev/null 2>&1; then
  echo "expected repeat validation to fail" >&2
  exit 1
fi

if "$STRESS_SCRIPT" --iterations nope >/dev/null 2>&1; then
  echo "expected iteration validation to fail" >&2
  exit 1
fi

echo "all giga upgrade script tests passed"
