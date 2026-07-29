export function parseSteps(args: string[]): string[] | undefined {
  const idx = args.indexOf("--steps");
  if (idx === -1) return undefined;
  const value = args[idx + 1];
  if (!value) return undefined;
  return value.split(",").map((s) => s.trim());
}
