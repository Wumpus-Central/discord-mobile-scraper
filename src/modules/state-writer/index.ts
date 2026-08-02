import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import type { ParsedVersion } from "#src/utils/discord-version.js";
import { parseVersion } from "#src/utils/discord-version.js";
import { findLatestWorkspace } from "#src/utils/workspace.js";
import { writeState, readState } from "#src/modules/opengist/index.js";
import { GitService } from "./git.js";

const log = logger.child({ module: "state-writer" });

function commitMessage(version: ParsedVersion): string {
  return `${version.major}.${version.minor} (${version.raw})`;
}

export const stateWriter: StepHandler = async (ctx) => {
  let version = ctx.state["version"] as ParsedVersion | undefined;
  let sourcePath = ctx.state["sourcePath"] as string | undefined;

  if (!version || !sourcePath) {
    sourcePath = await findLatestWorkspace("src");
    version = parseVersion(parseInt(sourcePath.split("/")[1] ?? "0", 10));
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

  const existing = await readState().catch((): Record<string, unknown> => ({}));

  await writeState({
    alpha: version.raw,
    major: version.major,
    minor: version.minor,
    stats: ctx.state["stats"] ?? existing["stats"],
  });

  log.info("State saved to Opengist");

  return ctx;
};
