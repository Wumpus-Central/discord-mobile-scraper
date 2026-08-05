import { convertModuleHeader } from "./convert-module-header.js";
import { fixNumericImports } from "./fix-numeric-imports.js";
import { requireToImport } from "./require-to-import.js";

export type Transform = (content: string, filePath: string, state: Record<string, unknown>) => string;

export const placeholder: Transform = (content) => content;

export const transforms = [
  { name: "convert-module-header", fn: convertModuleHeader },
  { name: "fix-numeric-imports", fn: fixNumericImports },
  { name: "require-to-import", fn: requireToImport },
];
