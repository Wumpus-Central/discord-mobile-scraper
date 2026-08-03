import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import type { Action } from "./index.js";

const log = logger.child({ module: "patcher" });

interface ModuleEntry {
  module: string;
  filename: string;
  path: string;
}

const HEADER_RE = /^\/\/ === Module (\d+): (.+) ===$/m;

export const getModulesMap: Action = async (sourceDir, state) => {
  log.info("Building modules map");

  const paths = (await readdir(sourceDir, { recursive: true })).filter((p) => /\.(js|tsx?)$/.test(p));

  const map: Record<string, ModuleEntry> = {};

  for (const relPath of paths) {
    const filePath = join(sourceDir, relPath);
    const header = await readFile(filePath, { encoding: "utf8", flag: "r" }).then((f) => f.slice(0, 200));
    const match = HEADER_RE.exec(header);

    if (match) {
      map[match[1] ?? "?"] = {
        module: match[2] ?? "?",
        filename: relPath.split("/").pop() ?? "?",
        path: `./${relPath}`,
      };
    }
  }

  state["modulesMap"] = map;
  log.info({ entries: Object.keys(map).length }, "Modules map built");
};
