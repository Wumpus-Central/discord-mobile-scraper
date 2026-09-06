/**
 * hermes-decomp occasionally may have issues and may expand a single module
 * into a file tens of MBs large (observed up to 378 MB). GitHub rejects
 * pushes with files > 100 MB and warns above 50 MB, so oversized files
 * are removed from both src and src-unpatched before patching.
 * Each removal is logged with its size.
 */

import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

import { logger } from "#src/logger.js";
import type { PreAction } from "./index.js";

const log = logger.child({ module: "patcher" });

const MAX_MB = 50;
const MB = 1024 * 1024;

async function scanDir(dir: string): Promise<{ file: string; sizeMb: number }[]> {
  const entries = await readdir(dir, { recursive: true });
  const removed: { file: string; sizeMb: number }[] = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);

    if (info.isFile() && info.size >= MAX_MB * MB) {
      await rm(path);
      removed.push({ file: entry, sizeMb: Number((info.size / MB).toFixed(2)) });
    }
  }

  return removed;
}

export const removeOversized: PreAction = async (sourceDir) => {
  const targets = [sourceDir, join(dirname(sourceDir), "src-unpatched")].filter(existsSync);

  for (const dir of targets) {
    const removed = await scanDir(dir);

    for (const file of removed) {
      log.warn({ file: file.file, sizeMb: file.sizeMb }, `Removed oversized file (>= ${MAX_MB} MB)`);
    }

    if (removed.length > 0) {
      log.warn({ removed }, `Removed ${removed.length} oversized file(s) (>= ${MAX_MB} MB)`);
    }
  }
};
