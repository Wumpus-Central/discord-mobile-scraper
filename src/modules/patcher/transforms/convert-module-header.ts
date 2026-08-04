import type { Transform } from "./index.js";

export const convertModuleHeader: Transform = (content, filePath) => {
  const relPath = filePath.match(/src\/(.+)$/)?.[1] ?? filePath;
  const pathComment = `// ${relPath}\n`;

  if (content.startsWith(pathComment)) return content;

  const lines = content.split("\n");
  const hasModuleHeader =
    lines.length >= 3 && lines[0]?.startsWith("// === Module") && lines[2]?.startsWith("// Module");

  if (hasModuleHeader) {
    return pathComment + lines.slice(3).join("\n");
  }

  return pathComment + content;
};
