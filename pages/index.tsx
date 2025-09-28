import { FormEvent, useState } from "react";
import SoulSigilGallery from "../components/SoulSigilGallery";

const DEFAULT_USER = "sei1yq0v0y7ux0kvp9fj3z3qk3y5z3k3y5z3k3y5z3";

export default function NovaDashboard() {
  const [user, setUser] = useState<string>(DEFAULT_USER);
  const [input, setInput] = useState<string>(DEFAULT_USER);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUser(input.trim());
  };

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl ring-1 ring-slate-800/50">
          <h1 className="text-3xl font-semibold text-white">Nova Vault Scanner</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter a wallet address to surface the SoulSigils that chronicle its sovereign earnings.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 text-slate-900 md:flex-row">
            <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 focus-within:border-emerald-500">
              <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vault Address
              </span>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="sei1..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-400 bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow transition hover:bg-emerald-400"
            >
              Scan Vault
            </button>
          </form>
        </section>

        <SoulSigilGallery user={user} />
      </div>
    </main>
  );
}
