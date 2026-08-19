import { dirname, relative } from "node:path";
import type { Transform } from "./index.js";

interface ModuleEntry {
  module: string;
  filename: string;
  path: string;
}

// hermes-decomp v0.2.3 renders escaped factory roles as `_require(123)`, which the
// plain `require` pattern misses. Non-chained calls take a `/* name */` comment via the
// lookahead pass first; chained accesses (`_require(71).foo()`) are fixed in the second
// pass without a comment, because `require("x") /* name */.foo()` is invalid JS.
const NUMERIC_REQUIRE_SAFE_RE = /(?:_?require|importDefault)\((\d+)\)(?:\s*\/\*\s*\S+\s*\*\/)?(?!\s*\.)/g;
const NUMERIC_REQUIRE_RE = /(?:_?require|importDefault)\((\d+)\)(?:\s*\/\*\s*\S+\s*\*\/)?/g;
// hermes-decomp v0.2.3 also emits string-specifier requires of module names
// (`require("module_16")`); the numeric id embedded in the name maps to a real path.
const STRING_MODULE_REQUIRE_RE = /require\("module_(\d+)"\)/g;
const MODULE_IMPORT_RE = /import module_(\d+) from "module_(\d+)"(?:\s*\/\*\s*\d+\s*\*\/)?/g;
const ID_IMPORT_RE = /^(\s*import\s+[\s\S]*?\sfrom\s+)"([^"]+)"\s*\/\*\s*(\d+)\s*\*\/\s*;?\s*$/;
const ID_SIDE_EFFECT_IMPORT_RE = /^(\s*import\s+)"([^"]+)"\s*\/\*\s*(\d+)\s*\*\/\s*;?\s*$/;

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

function requireTarget(
  map: Record<string, ModuleEntry>,
  sourceDir: string,
  withName: boolean,
): (fullMatch: string, moduleId: string) => string {
  return (fullMatch, moduleId) => {
    const entry = map[moduleId];
    if (!entry) return fullMatch;

    const target = resolvePath(entry, sourceDir);
    if (!target) return fullMatch;

    return withName ? `require("${target}") /* ${assertImportName(entry)} */` : `require("${target}")`;
  };
}

function resolveIdImport(line: string, map: Record<string, ModuleEntry>, sourceDir: string): string {
  for (const re of [ID_IMPORT_RE, ID_SIDE_EFFECT_IMPORT_RE]) {
    const match = re.exec(line);
    if (!match) continue;

    const prefix = match[1] ?? "";
    const moduleId = match[3] ?? "";
    const entry = map[moduleId];
    if (!entry) return line;

    const target = resolvePath(entry, sourceDir);
    return target ? `${prefix}"${target}";` : line;
  }
  return line;
}

export const fixNumericImports: Transform = (content, filePath, state) => {
  const map = state["modulesMap"] as Record<string, ModuleEntry> | undefined;
  if (!map) return content;

  const relPath = filePath.match(/src\/(.+)$/)?.[1];
  if (!relPath) return content;

  const sourceDir = dirname(relPath);

  let result = content.replaceAll(NUMERIC_REQUIRE_SAFE_RE, requireTarget(map, sourceDir, true));
  result = result.replaceAll(NUMERIC_REQUIRE_RE, requireTarget(map, sourceDir, false));
  result = result.replaceAll(STRING_MODULE_REQUIRE_RE, requireTarget(map, sourceDir, false));

  result = result.replaceAll(MODULE_IMPORT_RE, (_fullMatch, id1, id2) => {
    if (id1 !== id2) return _fullMatch as string;

    const entry = map[id1 as string];
    if (!entry) return _fullMatch as string;

    const name = assertImportName(entry);
    const target = resolvePath(entry, sourceDir);
    return `import ${name} from "${target}"`;
  });

  result = result
    .split("\n")
    .map((line) => resolveIdImport(line, map, sourceDir))
    .join("\n");

  return result;
};
