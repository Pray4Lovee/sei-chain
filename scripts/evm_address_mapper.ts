import { ethers } from "ethers";
import axios from "axios";

const RPC = process.env.SEI_EVM_RPC!;
const REST = process.env.SEI_REST_ENDPOINT!;
const provider = new ethers.JsonRpcProvider(RPC);

export async function ensureEvmMapping(seiAddress: string) {
    const mappingEndpoint = `${REST}/cosmos/evm/v1/mapping/${seiAddress}`;
    const res = await axios.get(mappingEndpoint);

    if (!res.data || !res.data.evm_address) {
        throw new Error("No EVM mapping exists for this Sei address.");
    }

    return res.data.evm_address as string;
}

export async function sendERC20(
    tokenAddress: string,
    from: ethers.Wallet,
    seiRecipient: string,
    amount: bigint
) {
    const evmRecipient = await ensureEvmMapping(seiRecipient);

    const erc20 = new ethers.Contract(
        tokenAddress,
        ["function transfer(address,uint256) public returns (bool)"],
        from.connect(provider)
    );

    return erc20.transfer(evmRecipient, amount);
}
