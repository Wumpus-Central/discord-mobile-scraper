export interface ExperimentsFile {
  experiments: Record<string, unknown>;
  "apex-experiments": Record<string, unknown>;
}

export interface ExperimentChange {
  id: string;
  kind: string;
  type: "legacy" | "apex";
}

export interface ExperimentsDiff {
  added: ExperimentChange[];
  removed: ExperimentChange[];
}

function readKind(record: unknown): string {
  if (typeof record !== "object" || record === null) return "?";

  const kind = (record as Record<string, unknown>)["kind"];
  return typeof kind === "string" ? kind : "?";
}

function collectChanges(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
  type: ExperimentChange["type"],
): { added: ExperimentChange[]; removed: ExperimentChange[] } {
  const added: ExperimentChange[] = [];
  const removed: ExperimentChange[] = [];

  for (const [id, record] of Object.entries(current)) {
    if (!(id in previous)) {
      added.push({ id, kind: readKind(record), type });
    }
  }

  for (const [id, record] of Object.entries(previous)) {
    if (!(id in current)) {
      removed.push({ id, kind: readKind(record), type });
    }
  }

  return { added, removed };
}

export function computeExperimentsDiff(previous: ExperimentsFile, current: ExperimentsFile): ExperimentsDiff {
  const legacy = collectChanges(previous.experiments ?? {}, current.experiments, "legacy");
  const apex = collectChanges(previous["apex-experiments"] ?? {}, current["apex-experiments"], "apex");

  return {
    added: [...legacy.added, ...apex.added],
    removed: [...legacy.removed, ...apex.removed],
  };
}
