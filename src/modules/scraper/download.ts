import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import { VENDETTA_TRACKER, USER_AGENT } from "#src/modules/vendetta/index.js";

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
  const sizeMb = totalSize > 0 ? (totalSize / 1024 / 1024).toFixed(1) : "unknown";

  log.info({ url, size: `${sizeMb} MB` }, `Downloading ${split}.apk`);

  const chunks: Uint8Array[] = [];
  let downloaded = 0;
  const startTime = Date.now();

  const progressInterval = setInterval(() => {
    if (totalSize > 0) {
      const pct = ((downloaded / totalSize) * 100).toFixed(1);
      const mb = (downloaded / 1024 / 1024).toFixed(1);
      log.info({ pct: `${pct}%`, mb: `${mb} MB` }, `Downloading ${split}.apk`);
    } else {
      const mb = (downloaded / 1024 / 1024).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      log.info({ downloaded: `${mb} MB`, elapsed: `${elapsed}s` }, `Downloading ${split}.apk`);
    }
  }, 1000);

  const reader = res.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      downloaded += value.length;
      chunks.push(value);
    }
  } finally {
    clearInterval(progressInterval);
    reader.releaseLock();
  }

  const buffer = Buffer.concat(chunks);
  await writeFile(filePath, buffer);

  const took = ((Date.now() - startTime) / 1000).toFixed(1);
  const finalMb = (downloaded / 1024 / 1024).toFixed(1);

  log.info({ filePath, size: `${finalMb} MB`, took: `${took}s` }, `Downloaded ${split}.apk`);

  return filePath;
}
