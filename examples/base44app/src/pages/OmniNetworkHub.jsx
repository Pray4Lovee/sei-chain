import React from "react";
import PageScaffold from "./PageScaffold";

const layers = [
  {
    name: "Macro Layer",
    description: "Single control surface for connecting to heterogeneous blockchain networks.",
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

export default function OmniNetworkHub() {
  return (
    <PageScaffold
      title="OmniNetwork Hub"
      subtitle="Single control surface for connecting to heterogeneous blockchain networks."
      layers={layers}
    />
  );
}
