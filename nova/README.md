# Nova 🪐

Autonomous SEI Capital Agent — compounding validator rewards intelligently.

## Features

- Dynamic validator selection
- Transaction orchestration
- Vault/mock signer support
- Telegram alerts
- Configurable via YAML
- CLI and Docker runnable

## Run

```bash
python3 cli/control.py
```

## Docker

```bash
docker build -t nova .
docker run -d --name nova nova
```
