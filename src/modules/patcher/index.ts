import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import { findLatestWorkspace } from "#src/utils/workspace.js";
import { transforms } from "./transforms/index.js";
import { actions } from "./actions/index.js";

const log = logger.child({ module: "patcher" });

async function applyActions(sourceDir: string): Promise<void> {
  for (const { name, run } of actions) {
    log.info(`Action: ${name}`);
    await run(sourceDir);
  }
}

async function applyTransforms(filePath: string): Promise<void> {
  let content = await readFile(filePath, "utf8");
  let changed = false;

  for (const { fn } of transforms) {
    const result = fn(content, filePath);
    if (result !== content) {
      content = result;
      changed = true;
    }
  }

  if (changed) {
    await writeFile(filePath, content);
  }
}

export const patcher: StepHandler = async (ctx) => {
  const sourceDir = (ctx.state["sourcePath"] as string | undefined) ?? (await findLatestWorkspace("src"));

  log.info("Applying patches");

  await applyActions(sourceDir);

  const files = (await readdir(sourceDir, { recursive: true })).filter((e) => /\.(js|tsx?)$/.test(e));

  log.info(`Processing ${files.length} files`);

  for (const relPath of files) {
    await applyTransforms(join(sourceDir, relPath));
  }

  log.info("Patches applied");

  return ctx;
};
