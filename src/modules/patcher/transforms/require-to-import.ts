import type { Transform } from "./index.js";

// NOOP (hermes-decomp v0.2.3+):
//
// This transform converts `require("path") /* hint */` calls into hoisted ESM imports.
// hermes-decomp v0.2.3 stopped emitting name-hint comments on string requires
// (0 matches on the Discord bundle), so this transform matches nothing and returns
// the content unchanged.
//
// Kept intentionally: if a future decompiler release restores the hint format, this
// transform becomes live again with no code change. Remove it only after verifying
// that the hint format is gone for good.
const REQUIRE_HINT_RE = /require\("([^"]+)"\)\s*\/\*\s*(\S+)\s*\*\//g;

export const requireToImport: Transform = (content) => {
  const imports = new Map<string, string>();

  for (const [, path, hint] of content.matchAll(REQUIRE_HINT_RE)) {
    if (!path || !hint) continue;
    if (!imports.has(path)) {
      imports.set(path, hint);
    }
  }

  if (imports.size === 0) return content;

  const result = content.replaceAll(REQUIRE_HINT_RE, (_fullMatch, path, hint) => {
    if (path && hint && imports.get(path) === hint) return hint;
    return _fullMatch as string;
  });

  const sorted = [...imports].sort(([a], [b]) => a.localeCompare(b));
  const importStatements = sorted.map(([path, hint]) => `import { ${hint} } from "${path}";`).join("\n");

  const lines = result.split("\n");
  const tail = lines.findLastIndex((l) => /^\s*import\s/.test(l));

  if (tail !== -1) {
    lines.splice(tail + 1, 0, importStatements);
  } else {
    lines.splice(1, 0, importStatements);
  }

  return lines.join("\n");
};
