import { simpleGit, type SimpleGit } from "simple-git";

import { logger } from "#src/logger.js";

const log = logger.child({ module: "state-writer" });

export class GitService {
  private g: SimpleGit;

  constructor(sourcePath: string) {
    this.g = simpleGit(sourcePath);
  }

  async init(remote: string): Promise<void> {
    await this.g.raw(["init"]);
    await this.g.raw(["config", "user.name", "github-actions[bot]"]);
    await this.g.raw(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);

    try {
      await this.g.raw(["remote", "add", "origin", remote]);
    } catch (err) {
      if ((err as Error).message.includes("already exists")) {
        await this.g.raw(["remote", "set-url", "origin", remote]);
      } else {
        throw err;
      }
    }

    try {
      await this.g.raw(["fetch", "--depth", "1", "--filter=blob:none", "origin", "main"]);
      await this.g.raw(["reset", "FETCH_HEAD"]);
    } catch {
      log.info("No existing remote history — first push");
    }
  }

  async addAndCommit(message: string): Promise<boolean> {
    await this.g.raw(["add", "."]);
    await this.g.raw(["reset", "_runtime/"]);

    const sourceOk = await this.commit(message);
    const runtimeOk = await this.commit(`${message} runtime`, ["_runtime/"]);

    return sourceOk || runtimeOk;
  }

  private async commit(message: string, addArgs?: string[]): Promise<boolean> {
    if (addArgs) {
      await this.g.raw(["add", ...addArgs]);
    }

    try {
      await this.g.raw(["commit", "-m", message]);
      return true;
    } catch (err) {
      if ((err as Error).message.includes("nothing to commit")) {
        return false;
      }
      throw err;
    }
  }

  async push(branch: string): Promise<void> {
    await this.g.raw(["branch", "-M", branch]);
    await this.g.raw(["push", "origin", branch]);
  }
}
