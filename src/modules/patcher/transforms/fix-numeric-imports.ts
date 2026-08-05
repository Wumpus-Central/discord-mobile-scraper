import { dirname, relative } from "node:path";
import type { Transform } from "./index.js";

interface ModuleEntry {
  module: string;
  filename: string;
  path: string;
}

const NUMERIC_REQUIRE_RE = /(?:require|importDefault)\((\d+)\)(?:\s*\/\*\s*\S+\s*\*\/)?/g;
const MODULE_IMPORT_RE = /import module_(\d+) from "module_(\d+)"/g;

function assertImportName(entry: ModuleEntry): string {
  if (entry.module === "?") {
    return entry.filename.replace(/\.[^.]+$/, "");
  }
  return entry.module;
}

function resolvePath(entry: ModuleEntry, sourceDir: string): string | null {
  const normalized = entry.path.startsWith("./") ? entry.path.slice(2) : entry.path;
  return relative(sourceDir, normalized);
}

export const fixNumericImports: Transform = (content, filePath, state) => {
  const map = state["modulesMap"] as Record<string, ModuleEntry> | undefined;
  if (!map) return content;

  const relPath = filePath.match(/src\/(.+)$/)?.[1];
  if (!relPath) return content;

  const sourceDir = dirname(relPath);

  let result = content.replaceAll(NUMERIC_REQUIRE_RE, (_fullMatch, moduleId) => {
    const entry = map[moduleId as string];
    if (!entry) return _fullMatch as string;

    const target = resolvePath(entry, sourceDir);
    return target ? `require("${target}") /* ${assertImportName(entry)} */` : (_fullMatch as string);
  });

  result = result.replaceAll(MODULE_IMPORT_RE, (_fullMatch, id1, id2) => {
    if (id1 !== id2) return _fullMatch as string;

    const entry = map[id1 as string];
    if (!entry) return _fullMatch as string;

    const name = assertImportName(entry);
    const target = resolvePath(entry, sourceDir);
    return `import ${name} from "${target}"`;
  });

  return result;
};
