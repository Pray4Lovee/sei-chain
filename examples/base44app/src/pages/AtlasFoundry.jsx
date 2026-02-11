import React from "react";
import PageScaffold from "./PageScaffold";

const layers = [
  {
    name: "Macro Layer",
    description: "Build and launch multi-chain execution blueprints from reusable templates.",
    points: ["Global posture snapshot", "Cross-chain synchronization", "A2A coordination rail"],
  },
  {
    name: "Micro Layer",
    description: "Operator-level controls for instant response and precision execution.",
    points: ["Policy gates", "Intent queue", "Telemetry feed"],
  },
  {
    name: "AI Layer",
    description: "Codex-native agents recommend, simulate, and automate safe actions.",
    points: ["Anomaly forecasting", "Plan synthesis", "Auto-remediation playbooks"],
  },
];

export default function AtlasFoundry() {
  return (
    <PageScaffold
      title="Atlas Foundry"
      subtitle="Build and launch multi-chain execution blueprints from reusable templates."
      layers={layers}
    />
  );
}
