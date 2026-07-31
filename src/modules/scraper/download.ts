import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import { VENDETTA_TRACKER, USER_AGENT } from "#src/modules/vendetta/index.js";

const log = logger.child({ module: "scraper" });

export async function downloadSplit(version: number, split: string, workspace: string): Promise<string> {
  const url = `${VENDETTA_TRACKER}/download/${version}/${split}`;
  const filePath = join(workspace, `${split}.zip`);

  log.info({ url }, `Downloading ${split}.apk`);

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${split}.apk: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buffer);

  log.info({ filePath, size: buffer.length }, `Downloaded ${split}.apk`);

  return filePath;
}
