import React, { useMemo, useState } from "react";
import { Terminal, Play, RotateCcw } from "lucide-react";
import PageScaffold from "./PageScaffold";

const layers = [
  {
    name: "Macro Layer",
    description: "Developer command center with workspace-wide execution visibility.",
    points: ["Task stream", "Cross-agent logs", "Git-aware automation"],
  },
  {
    name: "Micro Layer",
    description: "Fast command palette for repetitive engineering workflows.",
    points: ["One-click command macros", "Environment profiles", "Inline diagnostics"],
  },
  {
    name: "AI Layer",
    description: "Codex-style assistant that can scaffold, validate, and explain output.",
    points: ["Command suggestions", "Secure defaults", "Failure triage hints"],
  },
];

const presets = [
  "status",
  "checkout feature/a2a-mesh",
  "test --scope routing",
  "deploy --network all --safe",
  "agents sync --topology bazaar",
];

export default function BazaarCodexAtlas() {
  const [history, setHistory] = useState([
    "$ mesh init --profile sovereign",
    "✔ profile loaded",
    "$ agents health",
    "14 agents online · latency p95 43ms",
  ]);
  const [command, setCommand] = useState("");

  const prompt = useMemo(() => "bazaar@codex:~$", []);

  const runCommand = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setHistory((prev) => [...prev, `${prompt} ${trimmed}`, "✔ executed in sandbox mode"]);
    setCommand("");
  };

  return (
    <div className="space-y-6">
      <PageScaffold
        title="Bazaar Codex Atlas"
        subtitle="GitHub-like terminal, but tuned for app-native agent operations."
        layers={layers}
      />

      <section className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 shadow-xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="font-medium">DevTerminal // Mesh Workspace</span>
          </div>
          <div className="flex gap-2">
            <button
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium"
              onClick={() => runCommand(command)}
              type="button"
            >
              <Play className="h-3.5 w-3.5" /> Run
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs"
              onClick={() => setHistory([])}
              type="button"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-slate-800 bg-black/40 p-3">
            <div className="h-72 overflow-auto font-mono text-xs leading-6">
              {history.map((line, idx) => (
                <div key={`${line}-${idx}`} className={line.startsWith("$") ? "text-cyan-300" : "text-slate-300"}>
                  {line}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1">
              <span className="font-mono text-xs text-emerald-300">{prompt}</span>
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runCommand(command);
                }}
                placeholder="Type a command..."
                className="w-full bg-transparent text-xs text-slate-100 outline-none"
              />
            </div>
          </div>

          <aside className="space-y-3 rounded-lg border border-slate-800 bg-black/30 p-3">
            <p className="text-xs uppercase tracking-wider text-slate-400">Command presets</p>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCommand(preset)}
                className="block w-full rounded-md border border-slate-700 px-2 py-1.5 text-left font-mono text-xs text-slate-200 hover:bg-slate-800"
              >
                {preset}
              </button>
            ))}
          </aside>
        </div>
      </section>
    </div>
  );
}
