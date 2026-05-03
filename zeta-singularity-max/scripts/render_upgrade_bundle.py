#!/usr/bin/env python3
import json
import pathlib
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: render_upgrade_bundle.py <report.json> [output.md]", file=sys.stderr)
        return 2

    report_path = pathlib.Path(sys.argv[1])
    output_path = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else report_path.with_name("sip3-upgrade-bundle.md")
    report = json.loads(report_path.read_text())

    markdown = f"""# Sei-Giga / SIP-3 Upgrade Bundle

## Summary
- Label: {report['label']}
- Transactions: {report['tx_count']}
- Compute time: {report['compute_ns']} ns
- FFI time: {report['ffi_ns']} ns
- Throughput: {report['throughput_tps']:.2f} TPS

## Counters
- Success: {report['success']}
- Gas: {report['gas']}
- Swaps: {report['swaps']}
- NFTs: {report['nfts']}
- MEV flags: {report['mev']}
- DAO flags: {report['dao']}

## Suggested rollout checklist
- [ ] Attach this report to the Sei-Giga upgrade review.
- [ ] Confirm SIP-3 throughput target and success target are satisfied.
- [ ] Record the exact command used for the benchmark run.
- [ ] Repeat the run against the release candidate build.
"""

    output_path.write_text(markdown)
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
