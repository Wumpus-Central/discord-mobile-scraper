import { readdir, access } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "#src/logger.js";
import type { StepHandler } from "#src/pipeline.js";
import type { ParsedVersion } from "#src/utils/discord-version.js";
import { parseVersion } from "#src/utils/discord-version.js";
import { writeState } from "#src/modules/opengist/index.js";

const log = logger.child({ module: "state-writer" });

function commitMessage(version: ParsedVersion): string {
  return `${version.major}.${version.minor} (${version.raw})`;
}

async function git(args: string[], cwd: string): Promise<string> {
  const { exec } = await import("node:child_process");

  const shellArgs = args.map((a) => `'${a.replace(/'/g, "'\\''")}'`).join(" ");

  return new Promise((resolve, reject) => {
    exec(`git ${shellArgs}`, { cwd, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        log.error({ exitCode: error.code, stderr }, `git ${args[0]} failed`);
        reject(new Error(`git ${args[0]} failed (exit ${error.code})`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
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

  log.info(`Pushing source tree to Wumpus-Central/discord-mobile-datamining`);

  await git(["init"], sourcePath);

  try {
    await git(["remote", "add", "origin", remote], sourcePath);
  } catch (err) {
    if ((err as Error).message.includes("already exists")) {
      await git(["remote", "set-url", "origin", remote], sourcePath);
    } else {
      throw err;
    }
  }

  try {
    await git(["fetch", "--depth", "1", "--filter=blob:none", "origin", "main"], sourcePath);
    await git(["reset", "FETCH_HEAD"], sourcePath);
  } catch {
    log.info("No existing remote history — first push");
  }

  await git(["add", "-A"], sourcePath);

  await git(["config", "user.name", "github-actions[bot]"], sourcePath);
  await git(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], sourcePath);

  const message = commitMessage(version);

  try {
    await git(["commit", "-m", message], sourcePath);
  } catch (err) {
    if ((err as Error).message.includes("nothing to commit")) {
      log.info("No changes to commit — skipping push");
      return ctx;
    }
    throw err;
  }

  await git(["branch", "-M", "main"], sourcePath);
  await git(["push", "origin", "main"], sourcePath);

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
