import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { logger } from "#src/logger.js";
import type { PostAction } from "./index.js";

const log = logger.child({ module: "patcher" });

const BIOME_BIN = resolve(process.cwd(), "bin", "biome");
const CHUNK_SIZE = 800;
const FOUND_ERRORS_RE = /Found (\d+) errors/;
// Biome's parse-error counter counts cascading error nodes (a single broken
// construct yields dozens), so count distinct broken FILES instead via the
// `path:line:col category ━` diagnostic headers.
const DIAGNOSTIC_HEADER_RE = /^(.+?):\d+:\d+ \w+ ━+$/gm;

export const formatCode: PostAction = async (_sourceDir, changedFiles) => {
  if (changedFiles.length === 0) {
    log.info("No changed files — skipping formatting");
    return;
  }

  if (!existsSync(BIOME_BIN)) {
    throw new Error(`Biome binary not found at ${BIOME_BIN} — run npm run setup`);
  }

  log.info({ files: changedFiles.length }, "Formatting with Biome");

  let errors = 0;

  for (let i = 0; i < changedFiles.length; i += CHUNK_SIZE) {
    const chunk = changedFiles.slice(i, i + CHUNK_SIZE);
    const stderr = await formatChunk(chunk);

    const brokenFiles = new Set<string>();
    for (const match of stderr.matchAll(DIAGNOSTIC_HEADER_RE)) {
      if (match[1]) {
        brokenFiles.add(match[1]);
      }
    }

    const chunkErrors = brokenFiles.size > 0 ? brokenFiles.size : Number(FOUND_ERRORS_RE.exec(stderr)?.[1] ?? 0);

    if (chunkErrors > 0) {
      errors += chunkErrors;
      log.warn({ files: chunk.length, unformatted: chunkErrors }, "Biome skipped files with parse errors");
    }
  }

  log.info({ formatted: changedFiles.length, unformatted: errors }, "Formatting complete");
};

function formatChunk(paths: string[]): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(
      BIOME_BIN,
      ["format", "--write", ...paths],
      { cwd: process.cwd(), maxBuffer: 16 * 1024 * 1024 },
      (err, _stdout, stderr) => {
        // Exit code 1 = diagnostics (some files could not be formatted) — not fatal.
        const code = (err as NodeJS.ErrnoException | null)?.code;
        if (err && String(code) !== "1") {
          reject(err);
          return;
        }
        resolvePromise(stderr);
      },
    );
  });
}
