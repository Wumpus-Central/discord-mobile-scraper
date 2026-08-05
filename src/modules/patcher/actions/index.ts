import { getModulesMap } from "./get-modules-map.js";
import { publishModulesMap } from "./publish-modules-map.js";

export type Action = (sourceDir: string, state: Record<string, unknown>) => Promise<void>;

export const actions = [
  { name: "get-modules-map", run: getModulesMap },
  { name: "publish-modules-map", run: publishModulesMap },
];
