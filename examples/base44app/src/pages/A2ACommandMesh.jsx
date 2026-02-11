import React from "react";
import PageScaffold from "./PageScaffold";

const layers = [
  {
    name: "Macro Layer",
    description: "Agent-to-agent command bus for orchestration across protocol workers.",
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

export default function A2ACommandMesh() {
  return (
    <PageScaffold
      title="A2A CommandMesh"
      subtitle="Agent-to-agent command bus for orchestration across protocol workers."
      layers={layers}
    />
  );
}
