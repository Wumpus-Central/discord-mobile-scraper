import { logger } from "#src/logger.js";
import { getGist, updateGist } from "./endpoints/index.js";
import type { State } from "./types.js";

const log = logger.child({ module: "opengist" });

export async function readState(): Promise<State> {
  const gistId = process.env["OPENGIST_GIST_ID"];
  if (!gistId) {
    throw new Error("OPENGIST_GIST_ID is not set");
  }

  log.info("Reading state from Opengist");

  const gist = await getGist(gistId);
  const file = gist.files["versions.json"];

  if (!file) {
    throw new Error("versions.json not found in gist");
  }

  const state = JSON.parse(file.content) as State;

  log.info("State read successfully");
  return state;
}

export async function writeState(state: unknown): Promise<void> {
  const gistId = process.env["OPENGIST_GIST_ID"];
  if (!gistId) {
    throw new Error("OPENGIST_GIST_ID is not set");
  }

  log.info("Writing state to Opengist");

  await updateGist(gistId, {
    files: {
      "versions.json": {
        content: JSON.stringify(state, null, 2),
      },
    },
  });

  log.info("State written successfully");
}

export async function writeModulesMap(map: unknown): Promise<void> {
  const gistId = process.env["OPENGIST_GIST_ID"];
  if (!gistId) {
    throw new Error("OPENGIST_GIST_ID is not set");
  }

  log.info("Writing modules map to Opengist");

  await updateGist(gistId, {
    files: {
      "map.json": {
        content: JSON.stringify(map, null, 2),
      },
    },
  });

  log.info("Modules map written successfully");
}
