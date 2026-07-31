import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import type { ParsedVersion } from "#src/utils/discord-version.js";
import { fetchTrackerIndex } from "#src/modules/vendetta/tracker.js";
import { parseVersion } from "#src/utils/discord-version.js";
import { downloadSplit } from "./download.js";
import { SPLITS } from "./splits.js";

const log = logger.child({ module: "scraper" });

export const scraper: StepHandler = async (ctx) => {
  let version = ctx.state["version"] as ParsedVersion | undefined;

  if (!version) {
    const { latest } = await fetchTrackerIndex();
    const alpha = latest["alpha"];

    if (alpha === undefined) {
      throw new Error("Alpha version not found in tracker response");
    }

    version = parseVersion(alpha);
    ctx.state = { ...ctx.state, version };

    log.info({ version: version.raw }, "Fetched and parsed version from tracker");
  } else {
    log.info({ version: version.raw }, "Using version from pipeline context");
  }

  const workspace = join("workspace", String(version.raw));
  await mkdir(workspace, { recursive: true });

  log.info(`Downloading alpha ${version.raw}...`);

  for (const split of SPLITS) {
    await downloadSplit(version.raw, split, workspace);
  }

  ctx.state = { ...ctx.state, apkPath: workspace };

  log.info(`Scraper complete — APKs in ${workspace}`);

  return ctx;
};
