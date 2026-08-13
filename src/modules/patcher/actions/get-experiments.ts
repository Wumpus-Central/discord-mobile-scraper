import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import { saveGist } from "#src/modules/opengist/index.js";
import type { Action } from "./index.js";

const log = logger.child({ module: "patcher" });

const EXPERIMENT_RE = /createExperiment\.createExperiment\(/g;
const APEX_EXPERIMENT_RE = /ApexExperiment\.createApexExperiment\(/g;

function extractObjectLiteral(content: string, startIndex: number): string | null {
  let depth = 0;
  let started = false;
  let end = -1;

  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];

    if (char === "{" || char === "(") {
      depth++;
      started = true;
    } else if (char === "}" || char === ")") {
      depth--;
      if (started && depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) return null;

  const open = content.indexOf("{", startIndex);
  if (open === -1 || open > end) return null;

  return content.slice(open, end + 1);
}

function jsToJson(objLiteral: string): unknown | null {
  let text = objLiteral;

  text = text.replace(/\/\/[^\n]*/g, "");
  text = text.replace(/\/\*[\s\S]*?\*\//g, "");
  text = text.replace(/,(\s*[}\]])/g, "$1");
  text = text.replace(/`([^`]*)`/g, (_m, inner: string) => `"${inner.replace(/"/g, '\\"')}"`);
  text = text.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner: string) => `"${inner.replace(/"/g, '\\"')}"`);
  text = text.replace(/require\("([^"]+)"\)((?:\.[a-zA-Z_$][\w$]*)*)/g, '"$1$2"');
  text = text.replace(/([{,]\s*)([a-zA-Z_$][\w$]*|\d+)(\s*:)/g, '$1"$2"$3');
  text = text.replace(/:\s*((?!true\b|false\b|null\b)[a-zA-Z_$][\w$]*(?:\.[\w$]+)*)\s*(,|})/g, ': "$1"$2');

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findExperiments(content: string, regex: RegExp): Record<string, unknown> {
  const results: Record<string, unknown> = {};

  for (const match of content.matchAll(regex)) {
    const start = match.index ?? 0;
    const objLiteral = extractObjectLiteral(content, start + match[0].length);

    if (!objLiteral) continue;

    const parsed = jsToJson(objLiteral);
    if (!parsed || typeof parsed !== "object" || parsed === null) continue;

    const record = parsed as Record<string, unknown>;

    const key = (record["id"] ?? record["name"]) as string | undefined;
    if (!key) continue;

    results[key] = record;
  }

  return results;
}

function sortExperiments(records: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(records).sort(([a], [b]) => {
      const dateA = a.slice(0, 7);
      const dateB = b.slice(0, 7);
      if (dateA !== dateB) return dateB.localeCompare(dateA);

      const suffixA = a.slice(8);
      const suffixB = b.slice(8);
      return suffixA.localeCompare(suffixB);
    }),
  );
}

export const getExperiments: Action = async (sourceDir) => {
  log.info("Extracting experiments");

  const paths = (await readdir(sourceDir, { recursive: true })).filter((p) => /\.(js|tsx?)$/.test(p));

  const experiments: Record<string, unknown> = {};
  const apexExperiments: Record<string, unknown> = {};

  for (const relPath of paths) {
    const filePath = join(sourceDir, relPath);
    const content = await readFile(filePath, "utf8");

    Object.assign(experiments, findExperiments(content, EXPERIMENT_RE));
    Object.assign(apexExperiments, findExperiments(content, APEX_EXPERIMENT_RE));
  }

  const result = {
    experiments: sortExperiments(experiments),
    "apex-experiments": sortExperiments(apexExperiments),
  };

  log.info(
    { experiments: Object.keys(experiments).length, apex: Object.keys(apexExperiments).length },
    "Experiments extracted",
  );

  await saveGist("experiments.json", result);
  log.info("Experiments saved to Opengist");
};
