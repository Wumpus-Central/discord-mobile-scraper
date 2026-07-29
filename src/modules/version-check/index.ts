import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";

const log = logger.child({ module: "version-check" });

export const versionCheck: StepHandler = async (ctx) => {
  log.info("placeholder — version-check not implemented");
  return ctx;
};
