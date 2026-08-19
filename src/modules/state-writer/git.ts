import { simpleGit, type SimpleGit } from "simple-git";

import { logger } from "#src/logger.js";

const log = logger.child({ module: "state-writer" });

interface GitErrorWithTask extends Error {
  task?: { commands: string[] };
}

interface PushResult {
  hasChanges: boolean;
  sourceHash: string | null;
}

export class GitService {
  private g: SimpleGit;
  private token: string;
  private authHeader: string;

  constructor(sourcePath: string, token: string) {
    this.g = simpleGit(sourcePath);
    this.token = token;
    this.authHeader = `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
  }

  async pushToBranch(remote: string, branch: string, message: string): Promise<PushResult> {
    await this.init(remote, branch);

    const result = await this.addAndCommit(message);
    if (result.hasChanges) {
      await this.push(branch);
    }

    return result;
  }

  private async raw(args: string[]): Promise<unknown> {
    try {
      return await this.g.raw(["-c", `http.extraHeader=${this.authHeader}`, ...args]);
    } catch (err) {
      this.redactCredentials(err);
      throw err;
    }
  }

  private redactCredentials(err: unknown): void {
    if (!(err instanceof Error)) return;

    err.message = err.message.replaceAll(this.token, "[REDACTED]").replaceAll(this.authHeader, "[REDACTED]");

    const task = (err as GitErrorWithTask).task;
    if (task) {
      task.commands = task.commands.map((command) =>
        command.includes(this.token) || command.includes(this.authHeader) ? "[REDACTED]" : command,
      );
    }
  }

  private async init(remote: string, branch: string): Promise<void> {
    await this.raw(["init"]);
    await this.raw(["config", "user.name", "github-actions[bot]"]);
    await this.raw(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);

    try {
      await this.raw(["remote", "add", "origin", remote]);
    } catch (err) {
      if ((err as Error).message.includes("already exists")) {
        await this.raw(["remote", "set-url", "origin", remote]);
      } else {
        throw err;
      }
    }

    try {
      await this.raw(["fetch", "--depth", "1", "--filter=blob:none", "origin", branch]);
      await this.raw(["reset", "FETCH_HEAD"]);
    } catch {
      log.info("No existing remote history — first push");
    }
  }

  private async addAndCommit(message: string): Promise<PushResult> {
    await this.raw(["add", "."]);
    await this.raw(["reset", "_runtime/"]);

    const sourceOk = await this.commit(message);
    let sourceHash: string | null = null;
    if (sourceOk) {
      sourceHash = String(await this.raw(["rev-parse", "HEAD"])).trim();
    }

    const runtimeOk = await this.commit(`${message} runtime`, ["_runtime/"]);

    return { hasChanges: sourceOk || runtimeOk, sourceHash };
  }

  private async commit(message: string, addArgs?: string[]): Promise<boolean> {
    if (addArgs) {
      await this.raw(["add", ...addArgs]);
    }

    try {
      const output = String(await this.raw(["commit", "-m", message]));
      return !output.includes("nothing to commit");
    } catch (err) {
      if ((err as Error).message.includes("nothing to commit")) {
        return false;
      }
      throw err;
    }
  }

  private async push(branch: string): Promise<void> {
    await this.raw(["push", "origin", `HEAD:${branch}`]);
  }
}
