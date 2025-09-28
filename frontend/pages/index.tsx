import { useState, type FormEvent } from "react";
import BalanceCard from "../components/BalanceCard";
import RoyaltyDashboard from "../components/RoyaltyDashboard";
import TxHistory from "../components/TxHistory";

export default function HomePage() {
  const [userInput, setUserInput] = useState("");
  const [user, setUser] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUser(userInput.trim());
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Vault Keeper Console</h1>
        <p className="text-gray-600">
          Connect your wallet or paste an address to view balances, transactions, and royalty totals.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(event) => setUserInput(event.target.value)}
          placeholder="0x..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Load Dashboard
        </button>
      </form>

      {user && (
        <>
          <BalanceCard user={user} />
          <TxHistory user={user} />
          <RoyaltyDashboard />
        </>
      )}
    </main>
  );
}
