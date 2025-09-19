from wallet.signer import (
    available_balance,
    delegate,
    get_address,
    withdraw_rewards,
)
from strategies.yield_oracle import get_validators
from config.loader import load_config
from alerts.telegram import notify
from utils.logger import log


def run_cycle():
    cfg = load_config()
    addr = get_address(cfg["wallet_name"])
    validators = get_validators()

    withdraw_rewards(cfg, addr)

    balance = available_balance(cfg, addr)
    if balance < cfg["buffer"]:
        log(f"⛔ Buffer too low ({balance}). Skipping delegate.")
        return

    per_val = balance // len(validators)
    for val in validators:
        delegate(cfg, addr, val, per_val)
        notify(f"✅ Delegated {per_val} to {val}")
