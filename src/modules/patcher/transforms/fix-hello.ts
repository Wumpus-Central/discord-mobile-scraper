import { logger } from "#src/logger.js";
import type { Transform } from "./index.js";

const log = logger.child({ module: "patcher" });

let logged = false;

export const hello: Transform = (content) => {
  if (!logged) {
    log.info("Hello from patcher");
    logged = true;
  }
  return content;
};
