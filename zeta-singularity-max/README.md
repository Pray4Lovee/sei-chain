# zeta-singularity-max

Standalone TPS test harness and FFI-style kernel crate for Sei-Giga / SIP-3 dress rehearsals.

## Scripts

- `scripts/run_tps_benchmark.sh`: rebuilds the crate in release mode and writes text, JSON, and Markdown reports into `artifacts/`.
- `scripts/check_upgrade_readiness.py`: validates the generated JSON report against minimum throughput and success thresholds.
- `scripts/render_upgrade_bundle.py`: turns a JSON benchmark report into a Markdown bundle suitable for sharing in upgrade review docs.

## Example

```bash
cd zeta-singularity-max
scripts/run_tps_benchmark.sh
python3 scripts/check_upgrade_readiness.py artifacts/latest-performance.json 500000 50000
python3 scripts/render_upgrade_bundle.py artifacts/latest-performance.json artifacts/sip3-upgrade-bundle.md
```
