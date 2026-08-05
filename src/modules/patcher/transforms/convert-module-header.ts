import type { Transform } from "./index.js";

export const convertModuleHeader: Transform = (content, filePath) => {
  const relPath = filePath.match(/src\/(.+)$/)?.[1] ?? filePath;
  const pathComment = `// ${relPath}\n`;

  const body = content.startsWith(pathComment) ? content.slice(pathComment.length) : content;

  const lines = body.split("\n");
  const hasModuleHeader =
    lines.length >= 3 && lines[0]?.startsWith("// === Module") && lines[2]?.startsWith("// Module");

  if (hasModuleHeader) {
    return pathComment + lines.slice(3).join("\n");
  }

  return content.startsWith(pathComment) ? content : pathComment + content;
};
