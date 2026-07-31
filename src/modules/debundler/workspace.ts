import { readdir, access } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";

const log = logger.child({ module: "debundler" });

export async function findLatestUnpacked(): Promise<string> {
  const dirs = await readdir("workspace").catch(() => [] as string[]);
  const versions = dirs
    .filter((d) => /^\d+$/.test(d))
    .map(Number)
    .sort((a, b) => b - a);

  for (const version of versions) {
    const apkPath = join("workspace", String(version), "apk");
    const bundlePath = join(apkPath, "assets", "index.android.bundle");

    try {
      await access(bundlePath);
      log.info({ version, apkPath }, "Found existing workspace");
      return apkPath;
    } catch {
      continue;
    }
  }

  throw new Error("No workspace found. Scrape and unpack first, or set the unpackedPath in context via pipeline.");
}
