import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const vaultRoot = "/Users/clay/Desktop/Vanta Vault";
const skillRoot = "/Users/clay/.agents/skills";

const checks = [
  {
    label: "repo Full Blast trigger",
    path: resolve(repoRoot, "AGENTS.md"),
    includes: [
      "when Clay feeds ideas, preferences, product judgment, strategy, narrative, roadmap, or agent-identity guidance into a Full Blast/subagents task",
      "use `vanta-mind-map` as part of the trigger",
      "preserve a shared-location packet",
    ],
  },
  {
    label: "vanta-task-orchestrator skill trigger",
    path: resolve(skillRoot, "vanta-task-orchestrator/SKILL.md"),
    includes: [
      "Full Blast subagents with Clay-fed ideas",
      "`vanta-mind-map` before dispatching",
      "shared-location checkpoint",
    ],
  },
  {
    label: "vanta-mind-map skill",
    path: resolve(skillRoot, "vanta-mind-map/SKILL.md"),
    includes: [
      "name: vanta-mind-map",
      "Use Mind Map as active decision context for Vanta",
      "Shared Location Packet",
    ],
  },
  {
    label: "active memory concept",
    path: resolve(vaultRoot, "wiki/concepts/active-memory-flow.md"),
    includes: [
      "# Active Memory Flow",
      "Full Blast subagents trigger",
      "shared-location packet",
      "Conflict rule",
    ],
  },
  {
    label: "Mind Map concept link",
    path: resolve(vaultRoot, "wiki/concepts/mind-map.md"),
    includes: [
      "## Active memory flow",
      "[[wiki/concepts/active-memory-flow|Active Memory Flow]]",
      "`vanta-mind-map` skill",
    ],
  },
  {
    label: "Vanta operating model hook",
    path: resolve(vaultRoot, "05 Ops/Vanta Operating Model.md"),
    includes: [
      "## Active memory flow",
      "use the local `vanta-mind-map` skill",
      "shared-location packet",
    ],
  },
  {
    label: "wiki schema promotion rule",
    path: resolve(vaultRoot, "wiki/meta/AGENTS.md"),
    includes: [
      "## Active memory promotion",
      "For Full Blast/subagents work",
      "the local `vanta-mind-map` skill",
    ],
  },
  {
    label: "wiki index entry",
    path: resolve(vaultRoot, "wiki/meta/index.md"),
    includes: [
      "[[wiki/concepts/active-memory-flow|Active Memory Flow]]",
      "Full Blast subagents trigger",
    ],
  },
  {
    label: "wiki log entry",
    path: resolve(vaultRoot, "wiki/meta/log.md"),
    includes: [
      "Added Active Memory Flow and Mind Map skill trigger",
      "Created local skill `vanta-mind-map`",
    ],
  },
];

const failures = [];

for (const check of checks) {
  if (!existsSync(check.path)) {
    failures.push(`${check.label}: missing file ${check.path}`);
    continue;
  }

  const text = readFileSync(check.path, "utf8");
  for (const expected of check.includes) {
    if (!text.includes(expected)) {
      failures.push(`${check.label}: missing expected text: ${expected}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Active memory flow check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Active memory flow check passed.");
