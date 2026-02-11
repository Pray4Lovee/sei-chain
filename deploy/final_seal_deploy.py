from web3 import Web3
import json

RPC = "https://evm-rpc.sei-apis.com"
PRIVATE_KEY = "REPLACE_ME"
ACCOUNT = "REPLACE_ME"
GIGA_DROP_HASH = "0x534f5645524549474e474749474144524f503230323646494e414c"

w3 = Web3(Web3.HTTPProvider(RPC))


def main():
    with open("CodexFinalSeal.bin") as f:
        bytecode = f.read().strip()
    with open("CodexFinalSeal.abi") as f:
        abi = json.load(f)

    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    tx = contract.constructor(GIGA_DROP_HASH).build_transaction(
        {
            "from": ACCOUNT,
            "nonce": w3.eth.get_transaction_count(ACCOUNT),
            "gas": 5_000_000,
            "gasPrice": w3.to_wei("30", "gwei"),
        }
    )

    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print("Final Seal deployed:", tx_hash.hex())


if __name__ == "__main__":
    main()
