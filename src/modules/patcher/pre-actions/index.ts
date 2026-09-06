import { getModulesMap } from "./get-modules-map.js";
import { getExperiments } from "./get-experiments.js";
import { removeOversized } from "./remove-oversized.js";

export type PreAction = (sourceDir: string, state: Record<string, unknown>) => Promise<void>;

export const preActions = [
  { name: "remove-oversized", run: removeOversized },
  { name: "get-modules-map", run: getModulesMap },
  { name: "get-experiments", run: getExperiments },
];
