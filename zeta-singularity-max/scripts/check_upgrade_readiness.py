#!/usr/bin/env python3
import json
import pathlib
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: check_upgrade_readiness.py <report.json> [min_tps] [min_success]", file=sys.stderr)
        return 2

    report_path = pathlib.Path(sys.argv[1])
    min_tps = float(sys.argv[2]) if len(sys.argv) > 2 else 500_000.0
    min_success = int(sys.argv[3]) if len(sys.argv) > 3 else 50_000

    report = json.loads(report_path.read_text())
    throughput = float(report["throughput_tps"])
    success = int(report["success"])

    failures = []
    if throughput < min_tps:
        failures.append(f"throughput {throughput:.2f} TPS is below {min_tps:.2f} TPS")
    if success < min_success:
        failures.append(f"success {success} is below {min_success}")

    if failures:
        print("Upgrade readiness check FAILED")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Upgrade readiness check PASSED")
    print(f"- throughput_tps: {throughput:.2f}")
    print(f"- success: {success}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
