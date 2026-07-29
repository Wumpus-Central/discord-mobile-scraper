import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";

const log = logger.child({ module: "debundler" });

export const debundler: StepHandler = async (ctx) => {
  log.info("placeholder — debundler not implemented");
  return ctx;
};
