import { getModulesMap } from "./get-modules-map.js";
import { getExperiments } from "./get-experiments.js";

export type Action = (sourceDir: string, state: Record<string, unknown>) => Promise<void>;

export const actions = [
  { name: "get-modules-map", run: getModulesMap },
  { name: "get-experiments", run: getExperiments },
];
