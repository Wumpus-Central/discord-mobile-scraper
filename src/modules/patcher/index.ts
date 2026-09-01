import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import { findLatestWorkspace } from "#src/utils/workspace.js";
import { transforms } from "./transforms/index.js";
import { preActions } from "./pre-actions/index.js";
import { postActions } from "./post-actions/index.js";

const log = logger.child({ module: "patcher" });

async function applyPreActions(sourceDir: string, state: Record<string, unknown>): Promise<void> {
  for (const { name, run } of preActions) {
    log.info(`Pre-action: ${name}`);
    await run(sourceDir, state);
  }
}

async function applyPostActions(
  sourceDir: string,
  changedFiles: string[],
  state: Record<string, unknown>,
): Promise<void> {
  for (const { name, run } of postActions) {
    log.info(`Post-action: ${name}`);
    await run(sourceDir, changedFiles, state);
  }
}

async function applyTransforms(filePath: string, state: Record<string, unknown>): Promise<boolean> {
  let content = await readFile(filePath, "utf8");
  let changed = false;

  for (const { fn } of transforms) {
    const result = fn(content, filePath, state);
    if (result !== content) {
      content = result;
      changed = true;
    }
  }

  if (changed) {
    await writeFile(filePath, content);
  }

  return changed;
}

export const patcher: StepHandler = async (ctx) => {
  const sourceDir = (ctx.state["sourcePath"] as string | undefined) ?? (await findLatestWorkspace("src"));

  log.info("Applying patches");

  await applyPreActions(sourceDir, ctx.state);

  const files = (await readdir(sourceDir, { recursive: true })).filter((e) => /\.(js|tsx?)$/.test(e));

  log.info(`Processing ${files.length} files`);

  const changedFiles: string[] = [];

  for (const relPath of files) {
    const changed = await applyTransforms(join(sourceDir, relPath), ctx.state);
    if (changed) {
      changedFiles.push(join(sourceDir, relPath));
    }
  }

  log.info("Patches applied");

  await applyPostActions(sourceDir, changedFiles, ctx.state);

  return ctx;
};
