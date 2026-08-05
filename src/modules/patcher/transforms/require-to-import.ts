import type { Transform } from "./index.js";

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

  let result = content;

  for (const [path, hint] of imports) {
    const exact = `require("${path}") /* ${hint} */`;
    result = result.replaceAll(exact, hint);
  }

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
