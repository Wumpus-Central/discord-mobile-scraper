import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";

const log = logger.child({ module: "scraper" });

export const scraper: StepHandler = async (ctx) => {
  log.info("placeholder — scraper not implemented");
  return ctx;
};
