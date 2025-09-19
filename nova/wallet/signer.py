import json
import subprocess
from typing import Optional

from utils.logger import log


def run(cmd: str) -> Optional[str]:
    try:
        return subprocess.check_output(cmd, shell=True).decode().strip()
    except Exception as e:  # pylint: disable=broad-except
        log(f"❌ CMD failed: {e}")
        return None


def get_address(key: str) -> Optional[str]:
    return run(f"seid keys show {key} -a")


def withdraw_rewards(cfg: dict, addr: str) -> None:
    for val in cfg["validators"]:
        log(f"Withdrawing from {val}")
        run(
            f"seid tx distribution withdraw-rewards {val} "
            f"--from {cfg['wallet_name']} --fees {cfg['fee']} --gas {cfg['gas']} "
            f"--chain-id {cfg['chain_id']} --node {cfg['rpc_node']} -y"
        )


def delegate(cfg: dict, addr: str, validator: str, amount: int) -> None:
    log(f"Delegating {amount} to {validator}")
    run(
        f"seid tx staking delegate {validator} {amount}usei "
        f"--from {cfg['wallet_name']} --fees {cfg['fee']} --gas {cfg['gas']} "
        f"--chain-id {cfg['chain_id']} --node {cfg['rpc_node']} -y"
    )


def available_balance(cfg: dict, addr: str) -> int:
    out = run(f"seid query bank balances {addr} --node {cfg['rpc_node']} --output json")

    if not out:
        return 0

    try:
        return int(json.loads(out)["balances"][0]["amount"])
    except (KeyError, IndexError, ValueError, json.JSONDecodeError):
        return 0
