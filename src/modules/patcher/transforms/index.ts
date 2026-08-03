import { hello } from "./fix-hello.js";

export type Transform = (content: string, filePath: string) => string;

export const placeholder: Transform = (content) => content;

export const transforms = [{ name: "hello", fn: hello }];
