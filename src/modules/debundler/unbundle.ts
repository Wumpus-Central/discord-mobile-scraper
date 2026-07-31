import { createReadStream, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { logger } from "#src/logger.js";
import { classifyModule, type ClassifiedModule } from "./classify.js";

const log = logger.child({ module: "debundler" });

const MODULE_HEADER_RE = /^\/\/ === Module (\d+): (.+) ===$/;
const IMPORT_RE = /fileFinishedImporting\("([^"]+)"\)/;

interface Module {
  id: number;
  name: string;
  lines: string[];
  filePath: string | null;
}

export interface SplitCounters {
  source: number;
  runtime: number;
  total: number;
}

export async function parseModules(input: string): Promise<Module[]> {
  const modules: Module[] = [];
  let current: Module | null = null;

  const rl = createInterface({
    input: createReadStream(input, "utf8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const headerMatch = MODULE_HEADER_RE.exec(line);
    if (headerMatch) {
      if (current) {
        modules.push(current);
      }
      current = {
        id: parseInt(headerMatch[1] ?? "0", 10),
        name: headerMatch[2] ?? "?",
        lines: [],
        filePath: null,
      };
    } else if (current) {
      current.lines.push(line);
      if (!current.filePath) {
        const importMatch = IMPORT_RE.exec(line);
        if (importMatch) {
          current.filePath = importMatch[1] ?? null;
        }
      }
    }
  }
  rl.close();

  if (current) {
    modules.push(current);
  }

  return modules;
}

export async function writeTree(modules: Module[], outdir: string): Promise<SplitCounters> {
  const counters: SplitCounters = { source: 0, runtime: 0, total: modules.length };
  const batches: Promise<void>[][] = [];
  let currentBatch: Promise<void>[] = [];

  for (const mod of modules) {
    const classified = classifyModule(mod.id, mod.name, mod.filePath);
    const promise = writeModule(mod, classified, outdir).then(() => {
      if (mod.filePath) {
        counters.source++;
      } else {
        counters.runtime++;
      }
    });

    currentBatch.push(promise);

    if (currentBatch.length >= 50) {
      batches.push(currentBatch);
      currentBatch = [];
      log.debug(`  wrote: ${counters.source + counters.runtime} / ${counters.total} files`);
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  for (const batch of batches) {
    await Promise.all(batch);
  }

  return counters;
}

async function writeModule(mod: Module, classified: ClassifiedModule, outdir: string): Promise<void> {
  const targetDir = join(outdir, classified.dir);
  const target = join(targetDir, classified.filename);

  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }

  const header = `// === Module ${mod.id}: ${mod.name} ===\n`;
  const content = header + mod.lines.join("\n");

  await writeFile(target, content);
}
