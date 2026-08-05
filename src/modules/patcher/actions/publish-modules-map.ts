import { logger } from "#src/logger.js";
import { writeModulesMap } from "#src/modules/opengist/index.js";
import type { Action } from "./index.js";

const log = logger.child({ module: "patcher" });

export const publishModulesMap: Action = async (_sourceDir, state) => {
  const map = state["modulesMap"];
  if (!map) {
    log.warn("No modules map in state — skipping publish");
    return;
  }

  log.info("Publishing modules map to Opengist");
  await writeModulesMap(map);
};
