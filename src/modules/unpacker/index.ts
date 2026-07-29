import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";

const log = logger.child({ module: "unpacker" });

export const unpacker: StepHandler = async (ctx) => {
  log.info("placeholder — unpacker not implemented");
  return ctx;
};
