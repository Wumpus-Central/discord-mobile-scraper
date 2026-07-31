import { mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import { decompileBundle } from "./decompile.js";
import { findLatestUnpacked } from "./workspace.js";

const log = logger.child({ module: "debundler" });

export const debundler: StepHandler = async (ctx) => {
  const unpackedPath = (ctx.state["unpackedPath"] as string | undefined) ?? (await findLatestUnpacked());

  const root = dirname(unpackedPath);
  const bundlePath = join(unpackedPath, "assets", "index.android.bundle");
  const outputPath = join(root, "decompiled", "source.js");

  log.info(`Decompiling Hermes bundle from ${bundlePath}`);

  await mkdir(dirname(outputPath), { recursive: true });
  await decompileBundle(bundlePath, outputPath);

  ctx.state = { ...ctx.state, sourcePath: outputPath };

  log.info(`Debundler complete — output at ${outputPath}`);

  return ctx;
};
