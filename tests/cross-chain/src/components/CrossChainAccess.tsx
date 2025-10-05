import { useCallback, useMemo, useState } from "react";

type CrossChainAccessProps = {
  user: string;
};

type ProofResponse = {
  proof: string;
  publicSignals: string;
};

type AccessResponse = {
  success: boolean;
  message: string;
};

const SUPPORTED_CHAINS = [
  "sei",
  "polygon",
  "solana",
  "base",
  "arbitrum",
  "ethereum"
];

export default function CrossChainAccess({ user }: CrossChainAccessProps) {
  const [chain, setChain] = useState<string>("sei");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const chains = useMemo(() => SUPPORTED_CHAINS, []);

  const requestAccess = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const proofResponse = await fetch("/api/zk-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, sourceChain: chain })
      });
      const proofPayload = (await proofResponse.json()) as ProofResponse;

      const accessResponse = await fetch("/api/cross-chain-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user,
          sourceChain: chain,
          proof: proofPayload.proof,
          publicSignals: proofPayload.publicSignals
        })
      });

      const accessPayload = (await accessResponse.json()) as AccessResponse;
      setMessage(accessPayload.message);
    } catch (err) {
      setMessage("Access denied!");
    } finally {
      setLoading(false);
    }
  }, [chain, user]);

  return (
    <div>
      <label htmlFor="chain-select">Source chain</label>
      <select
        id="chain-select"
        data-testid="chain-select"
        value={chain}
        onChange={(event) => setChain(event.target.value)}
      >
        {chains.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button onClick={requestAccess} disabled={loading}>
        {loading ? "Requesting..." : "Request Vault Access"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}
