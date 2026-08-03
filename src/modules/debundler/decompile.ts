import { resolve } from "node:path";

import { logger } from "#src/logger.js";

const log = logger.child({ module: "debundler" });

const HERMES_DECOMP = resolve(process.cwd(), "bin", "hermes-decomp");

export interface DecompileResult {
  hermesVersion: string;
}

const PARSED_RE = /parsed: HBC v(\d+)/;

export async function decompileBundle(bundlePath: string, outputPath: string): Promise<DecompileResult> {
  const { execFile } = await import("node:child_process");

  log.info({ bundlePath, outputPath }, "Decompiling Hermes bundle");

  return new Promise((resolve, reject) => {
    const args = ["decompile", bundlePath, "-o", outputPath];
    const stderr: string[] = [];

    log.info({ command: `${HERMES_DECOMP} ${args.join(" ")}` }, "Launching Hermes decompiler");

    const child = execFile(HERMES_DECOMP, args, {
      timeout: 5_400_000, // 90min timeout
    });

    child.stderr?.on("data", (data: string) => {
      const text = data.toString().trim();
      stderr.push(text);
      log.info(text);
    });

    child.on("error", (err: Error) => {
      log.error(err, "Hermes decompiler failed to start");
      reject(err);
    });

    child.on("exit", (code: number | null, signal: string | null) => {
      if (code === 0) {
        log.info("Decompilation complete");

        let hermesVersion = "?0";

        for (const line of stderr) {
          const match = PARSED_RE.exec(line);
          if (match) {
            hermesVersion = match[1] ?? "?0";
            break;
          }
        }

        resolve({ hermesVersion });
      } else if (signal) {
        reject(new Error(`Hermes decompiler was killed by signal ${signal}`));
      } else {
        reject(new Error(`Hermes decompiler exited with code ${code}`));
      }
    });
  });
}
