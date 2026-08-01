import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import { PipelineStopError } from "#src/pipeline.js";
import { readState } from "#src/modules/opengist/index.js";
import { fetchTrackerIndex } from "#src/modules/vendetta/tracker.js";
import { parseVersion } from "#src/utils/discord-version.js";

const log = logger.child({ module: "version-check" });

export const versionCheck: StepHandler = async (ctx) => {
  log.info("Checking for alpha update...");

  const newState = await fetchTrackerIndex();
  const newVersion = newState.latest["alpha"];

  if (newVersion === undefined) {
    throw new Error("Alpha version not found in tracker response");
  }

  log.info({ newVersion }, "Fetched latest alpha version from tracker");

  const oldState = await readState();
  const oldVersion = oldState["alpha"] as number | undefined;

  if (oldVersion === undefined) {
    throw new Error("Previous alpha version not found in state");
  }

  log.info({ oldVersion }, "Loaded previous alpha version from Opengist");

  if (oldVersion === newVersion) {
    throw new PipelineStopError(`No update. Alpha ${oldVersion} unchanged`);
  }

  ctx.state = { ...ctx.state, version: parseVersion(newVersion) };

  log.info(`Update available: ${oldVersion} → ${newVersion}`);

  return ctx;
};
