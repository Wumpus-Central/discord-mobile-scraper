import { getModulesMap } from "./get-modules-map.js";
import { getExperiments } from "./get-experiments.js";

export type PreAction = (sourceDir: string, state: Record<string, unknown>) => Promise<void>;

export const preActions = [
  { name: "get-modules-map", run: getModulesMap },
  { name: "get-experiments", run: getExperiments },
];
