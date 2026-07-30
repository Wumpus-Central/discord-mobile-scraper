import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import { PipelineStopError } from "#src/pipeline.js";
import { readState } from "#src/modules/opengist/index.js";
import { VENDETTA_TRACKER, USER_AGENT } from "#src/modules/vendetta/index.js";

interface TrackerResponse {
  latest: Record<string, number>;
}

const log = logger.child({ module: "version-check" });

export const versionCheck: StepHandler = async (ctx) => {
  log.info("Checking for alpha update...");

  const res = await fetch(`${VENDETTA_TRACKER}/tracker/index`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Tracker responded with ${res.status} ${res.statusText}`);
  }

  const newState = (await res.json()) as TrackerResponse;
  const newVersion = newState.latest["alpha"];

  if (newVersion === undefined) {
    throw new Error("Alpha version not found in tracker response");
  }

  log.info({ newVersion }, "Fetched latest alpha version from tracker");

  const oldState = (await readState()) as unknown as TrackerResponse;
  const oldVersion = oldState.latest["alpha"];

  if (oldVersion === undefined) {
    throw new Error("Previous alpha version not found in state");
  }

  log.info({ oldVersion }, "Loaded previous alpha version from Opengist");

  if (oldVersion === newVersion) {
    throw new PipelineStopError(`No update. Alpha ${oldVersion} unchanged`);
  }

  ctx.state = { ...ctx.state, newVersion };

  log.info(`Update available: ${oldVersion} → ${newVersion}`);

  return ctx;
};
