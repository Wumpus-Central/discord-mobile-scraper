import { convertModuleHeader } from "./convert-module-header.js";

export type Transform = (content: string, filePath: string, state: Record<string, unknown>) => string;

export const placeholder: Transform = (content) => content;

export const transforms = [{ name: "convert-module-header", fn: convertModuleHeader }];
