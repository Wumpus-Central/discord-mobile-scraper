import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import { VENDETTA_TRACKER, USER_AGENT } from "#src/modules/vendetta/index.js";
import { ProgressTracker } from "./progress.js";
import { readBodyStream } from "./reader.js";

const log = logger.child({ module: "scraper" });

export async function downloadSplit(version: number, split: string, workspace: string): Promise<string> {
  const url = `${VENDETTA_TRACKER}/download/${version}/${split}`;
  const filePath = join(workspace, `${split}.zip`);

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${split}.apk: ${res.status} ${res.statusText}`);
  }

  const totalSize = parseInt(res.headers.get("Content-Length") ?? "0", 10);
  const progress = new ProgressTracker(totalSize, `${split}.apk`, log);

  log.info({ url, size: progress.sizeLabel() }, `Downloading ${split}.apk`);

  const buffer = await readBodyStream(res.body, (bytes: number) => progress.add(bytes));
  progress.done();
  await writeFile(filePath, buffer);

  log.info({ filePath, ...progress.summary() }, `Downloaded ${split}.apk`);

  return filePath;
}
