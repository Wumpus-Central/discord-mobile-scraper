export interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly channel: "alpha" | "beta" | "stable";
  readonly raw: number;
}

const CHANNELS: Record<number, "alpha" | "beta" | "stable"> = {
  0: "stable",
  1: "beta",
  2: "alpha",
};

export function parseVersion(raw: number): ParsedVersion {
  const str = String(raw);

  if (str.length < 3) {
    throw new Error(`Invalid version number: ${raw}`);
  }

  const minor = parseInt(str.slice(-2), 10);
  const channelIdx = parseInt(str.slice(-3, -2), 10);
  const major = parseInt(str.slice(0, -3), 10);
  const channel = CHANNELS[channelIdx];

  if (channel === undefined) {
    throw new Error(`Unknown channel index in version ${raw}: ${channelIdx}`);
  }

  return { major, minor, channel, raw };
}
