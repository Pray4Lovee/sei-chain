import { ethers } from "ethers";

export async function enforceStreamingRoyalty(
    router: string,
    wallet: ethers.Wallet,
    recipient: string,
    amount: bigint
) {
    const contract = new ethers.Contract(
        router,
        ["function enforceRoyalty(address) payable"],
        wallet
    );

    return contract.enforceRoyalty(recipient, {
        value: amount,
    });
}
