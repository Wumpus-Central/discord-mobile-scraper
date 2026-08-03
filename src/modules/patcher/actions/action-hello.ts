import { logger } from "#src/logger.js";
import type { Action } from "./index.js";

const log = logger.child({ module: "patcher" });

export const helloAction: Action = async (sourceDir) => {
  log.info(`Hello from action on ${sourceDir}`);
};
