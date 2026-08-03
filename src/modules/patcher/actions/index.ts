import { helloAction } from "./action-hello.js";

export type Action = (sourceDir: string) => Promise<void>;

export const actions = [{ name: "hello", run: helloAction }];
