import { readdir, access } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";

const log = logger.child({ module: "workspace" });

export async function findLatestWorkspace(subPath: string): Promise<string> {
  const dirs = await readdir("workspace").catch(() => [] as string[]);
  const versions = dirs
    .filter((d) => /^\d+$/.test(d))
    .map(Number)
    .sort((a, b) => b - a);

  for (const version of versions) {
    const path = join("workspace", String(version), subPath);
    try {
      await access(path);
      log.info({ version, path }, "Found existing workspace");
      return path;
    } catch {
      continue;
    }
  }

  throw new Error(`No workspace found with ${subPath}`);
}
