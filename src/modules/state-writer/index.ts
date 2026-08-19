import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import type { ParsedVersion } from "#src/utils/discord-version.js";
import { parseVersion } from "#src/utils/discord-version.js";
import { findLatestWorkspace } from "#src/utils/workspace.js";
import { readGist, saveGist } from "#src/modules/opengist/index.js";
import { GitService } from "./git.js";

// TEMP: unpatched debug branch — remove with TEMP_SHOULD_PUSH_TO_UNPATCHED_BRANCH
const TEMP_SHOULD_PUSH_TO_UNPATCHED_BRANCH = process.env["TEMP_SHOULD_PUSH_TO_UNPATCHED_BRANCH"] === "true";

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

  const remote = "https://github.com/Wumpus-Central/discord-mobile-datamining.git";

  log.info("Pushing source tree to Wumpus-Central/discord-mobile-datamining");
  log.debug(`Unpatched branch push enabled: ${TEMP_SHOULD_PUSH_TO_UNPATCHED_BRANCH}`);

  const git = new GitService(sourcePath, token);
  const result = await git.pushToBranch(remote, "main", commitMessage(version));

  // TEMP: unpatched debug branch — remove with TEMP_SHOULD_PUSH_TO_UNPATCHED_BRANCH
  if (TEMP_SHOULD_PUSH_TO_UNPATCHED_BRANCH) {
    try {
      const unpatchedPath = join(dirname(sourcePath), "src-unpatched");
      if (!existsSync(unpatchedPath)) {
        log.warn("src-unpatched not found — skipping unpatched branch push");
      } else {
        log.info("Pushing unpatched tree to Wumpus-Central/discord-mobile-datamining (branch: unpatched)");
        const unpatchedGit = new GitService(unpatchedPath, token);
        const unpatchedResult = await unpatchedGit.pushToBranch(remote, "unpatched", commitMessage(version));
        log.info(
          unpatchedResult.hasChanges
            ? "Pushed unpatched tree to origin/unpatched"
            : "No unpatched changes — branch up to date",
        );
      }
    } catch (err) {
      log.error(err, "Unpatched branch push failed — continuing");
    }
  }

  if (!result.hasChanges) {
    log.info("No changes to commit — skipping push");
    return ctx;
  }

  log.info("Pushed to GitHub");

  ctx.state["sourceCommit"] = result.sourceHash;

  const existing = await readGist<Record<string, unknown>>("versions.json").catch((): Record<string, unknown> => ({}));

  await saveGist("versions.json", {
    alpha: version.raw,
    major: version.major,
    minor: version.minor,
    stats: ctx.state["stats"] ?? existing["stats"],
  });

  log.info("State saved to Opengist");

  const modulesMap = ctx.state["modulesMap"];
  if (modulesMap !== undefined) {
    await saveGist("map.json", modulesMap);
    log.info("Modules map saved to Opengist");
  }

  return ctx;
};
