import { readdir, access } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import type { ParsedVersion } from "#src/utils/discord-version.js";
import { parseVersion } from "#src/utils/discord-version.js";
import { writeState } from "#src/modules/opengist/index.js";
import { GitService } from "./git.js";

const log = logger.child({ module: "state-writer" });

function commitMessage(version: ParsedVersion): string {
  return `${version.major}.${version.minor} (${version.raw})`;
}

async function findLatestSource(): Promise<{ version: ParsedVersion; sourcePath: string }> {
  const dirs = await readdir("workspace").catch(() => [] as string[]);
  const versions = dirs
    .filter((d) => /^\d+$/.test(d))
    .map(Number)
    .sort((a, b) => b - a);

  for (const raw of versions) {
    const path = join("workspace", String(raw), "src");
    try {
      await access(path);
      log.info({ version: raw, sourcePath: path }, "Found existing source tree");
      return { version: parseVersion(raw), sourcePath: path };
    } catch {
      continue;
    }
  }

  throw new Error("No source tree found in workspace — run debundler first");
}

export const stateWriter: StepHandler = async (ctx) => {
  let version = ctx.state["version"] as ParsedVersion | undefined;
  let sourcePath = ctx.state["sourcePath"] as string | undefined;

  if (!version || !sourcePath) {
    const resolved = await findLatestSource();
    version = resolved.version;
    sourcePath = resolved.sourcePath;
    ctx.state = { ...ctx.state, version, sourcePath };
  }

  const token = process.env["GH_TOKEN"];
  if (!token) {
    throw new Error("GH_TOKEN is not set");
  }

  const remote = `https://x-access-token:${token}@github.com/Wumpus-Central/discord-mobile-datamining.git`;

  log.info("Pushing source tree to Wumpus-Central/discord-mobile-datamining");

  const git = new GitService(sourcePath);
  await git.init(remote);

  const hasChanges = await git.addAndCommit(commitMessage(version));
  if (!hasChanges) {
    log.info("No changes to commit — skipping push");
    return ctx;
  }

  await git.push("main");
  log.info("Pushed to GitHub");

  await writeState({
    alpha: version.raw,
    major: version.major,
    minor: version.minor,
    stats: ctx.state["stats"],
  });

  log.info("State saved to Opengist");

  return ctx;
};
