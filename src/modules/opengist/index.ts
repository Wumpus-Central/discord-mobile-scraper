import { logger } from "#src/logger.js";
import { getGist, updateGist } from "./endpoints/index.js";

const log = logger.child({ module: "opengist" });

function getGistId(): string {
  const gistId = process.env["OPENGIST_GIST_ID"];
  if (!gistId) {
    throw new Error("OPENGIST_GIST_ID is not set");
  }

  return gistId;
}

export async function readGist<T>(filename: string): Promise<T> {
  const gistId = getGistId();

  log.info({ filename }, "Reading file from Opengist");

  const gist = await getGist(gistId);
  const file = gist.files[filename];

  if (!file) {
    throw new Error(`${filename} not found in gist`);
  }

  const value = JSON.parse(file.content) as T;

  log.info({ filename }, "File read successfully");
  return value;
}

export async function saveGist(filename: string, value: unknown): Promise<void> {
  const gistId = getGistId();

  log.info({ filename }, "Writing file to Opengist");

  await updateGist(gistId, {
    files: {
      [filename]: {
        content: JSON.stringify(value, null, 2),
      },
    },
  });

  log.info({ filename }, "File written successfully");
}
