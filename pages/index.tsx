"use client";

import { FormEvent, useMemo, useState } from "react";
import SoulSigilGallery from "../components/SoulSigilGallery";

const DEFAULT_USER = "demo.nebula";

export default function NovaDashboard() {
  const [userInput, setUserInput] = useState(DEFAULT_USER);
  const [activeUser, setActiveUser] = useState(DEFAULT_USER);

  const displayAddress = useMemo(() => activeUser.trim(), [activeUser]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = userInput.trim();
    if (!next) {
      return;
    }
    setActiveUser(next);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-800/60 bg-slate-900/60 p-8 shadow-2xl shadow-indigo-900/20 backdrop-blur">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Nova Sovereign Vault</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Plug in a wallet or sovereign identifier to unveil its SoulSigil lineage. The gallery
                will call into <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">/api/sigils</code>
                and render every claim-proof we know about.
              </p>
            </div>
            <form className="flex w-full max-w-md gap-2" onSubmit={onSubmit}>
              <input
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                placeholder="sei1..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-white shadow-inner focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                Reveal
              </button>
            </form>
          </header>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-5 shadow">
              <dt className="text-xs uppercase tracking-widest text-slate-400">Active sovereign</dt>
              <dd className="mt-2 text-lg font-semibold text-white">{displayAddress}</dd>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-5 shadow">
              <dt className="text-xs uppercase tracking-widest text-slate-400">Vault status</dt>
              <dd className="mt-2 text-lg font-semibold text-emerald-300">Synced</dd>
            </div>
          </dl>
        </section>

        <SoulSigilGallery user={displayAddress} />
      </div>
    </main>
  );
}
