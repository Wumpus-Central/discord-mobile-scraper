import { rm } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { stat } from "node:fs/promises";
import { join, dirname } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import { decompileBundle } from "./decompile.js";
import { findLatestUnpacked } from "./workspace.js";
import { parseModules, writeTree } from "./unbundle.js";

const log = logger.child({ module: "debundler" });

export const debundler: StepHandler = async (ctx) => {
  const unpackedPath = (ctx.state["unpackedPath"] as string | undefined) ?? (await findLatestUnpacked());

  const root = dirname(unpackedPath);
  const bundlePath = join(unpackedPath, "assets", "index.android.bundle");
  const sourceFile = join(root, "decompiled", "source.js");
  const sourceTree = join(root, "src");

  log.info(`Decompiling Hermes bundle from ${bundlePath}`);

  await mkdir(dirname(sourceFile), { recursive: true });
  const { size: bundleSize } = await stat(bundlePath);
  const decompileResult = await decompileBundle(bundlePath, sourceFile);

  log.info("Splitting into source tree");
  const modules = await parseModules(sourceFile);
  log.info({ count: modules.length }, "Parsed modules");

  const counters = await writeTree(modules, sourceTree);
  log.info({ source: counters.source, runtime: counters.runtime }, `Wrote ${counters.total} files to ${sourceTree}`);

  await rm(sourceFile);

  ctx.state = {
    ...ctx.state,
    sourcePath: sourceTree,
    stats: {
      modules: counters.total,
      source: counters.source,
      runtime: counters.runtime,
      hermesVersion: decompileResult.hermesVersion,
      bundleSize,
    },
  };

  log.info(`Debundler complete — source tree at ${sourceTree}`);

  return ctx;
};
