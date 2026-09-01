import { formatCode } from "./format-code.js";

export type PostAction = (sourceDir: string, changedFiles: string[], state: Record<string, unknown>) => Promise<void>;

export const postActions = [{ name: "format-code", run: formatCode }];
