import type { Transform } from "./index.js";

export const stripModuleHeaders: Transform = (content) => {
  const lines = content.split("\n");
  if (lines.length < 4) return content;

  if (lines[0]?.startsWith("// === Module") && lines[2]?.startsWith("// Module")) {
    return lines.slice(3).join("\n");
  }

  return content;
};
