import type { ExperimentChange, ExperimentsDiff } from "#src/utils/experiments.js";

const MAX_FIELD_CHARS = 1024;
const CODE_BLOCK_OVERHEAD = "```diff\n".length + "\n```".length;
const RESERVE_FOR_TRUNCATION_NOTE = 24;

export interface ChangesField {
  name: string;
  value: string;
}

function formatChange(change: ExperimentChange, prefix: "+" | "-"): string {
  return `${prefix} ${change.id} (${change.kind}, ${change.type})`;
}

export function buildChangesField(diff: ExperimentsDiff): ChangesField | null {
  const lines = [
    ...diff.added.map((change) => formatChange(change, "+")),
    ...diff.removed.map((change) => formatChange(change, "-")),
  ];

  if (lines.length === 0) return null;

  const budget = MAX_FIELD_CHARS - CODE_BLOCK_OVERHEAD - RESERVE_FOR_TRUNCATION_NOTE;
  const kept: string[] = [];
  let remaining = budget;

  for (const line of lines) {
    const cost = line.length + 1;
    if (kept.length > 0 && cost > remaining) break;
    kept.push(line);
    remaining -= cost;
  }

  const hidden = lines.length - kept.length;
  const value = ["```diff", ...kept, "```"].join("\n") + (hidden > 0 ? `\n…and ${hidden} more` : "");

  return {
    name: `Changes (${diff.added.length} added, ${diff.removed.length} removed)`,
    value,
  };
}
