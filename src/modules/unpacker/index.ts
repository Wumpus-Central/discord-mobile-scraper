import { rm } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import { extractZip } from "./extract.js";

const log = logger.child({ module: "unpacker" });

export const unpacker: StepHandler = async (ctx) => {
  const apkPath = ctx.state["apkPath"] as string | undefined;

  if (!apkPath) {
    throw new Error("No apkPath in context — run scraper first");
  }

  const entries = await readdir(apkPath);
  const zips = entries.filter((e) => e.endsWith(".zip"));

  if (zips.length === 0) {
    throw new Error(`No .zip files found in ${apkPath}`);
  }

  const unpackedPath = join(apkPath, "apk");

  log.info(`Unpacking ${zips.length} APK split(s)...`);

  for (const zipFile of zips) {
    const zipPath = join(apkPath, zipFile);
    log.info(`Extracting ${zipFile}`);
    await extractZip(zipPath, unpackedPath);
    await rm(zipPath);
    log.info(`Removed ${zipFile}`);
  }

  ctx.state = { ...ctx.state, unpackedPath };

  log.info(`Unpacker complete — extracted to ${unpackedPath}`);

  return ctx;
};
