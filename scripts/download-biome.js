import { createWriteStream } from "node:fs";
import { chmod, mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";

const REPO = "biomejs/biome";
const tag = process.env["BIOME_TAG"] || "latest";
const API_URL =
  tag === "latest"
    ? `https://api.github.com/repos/${REPO}/releases/latest`
    : `https://api.github.com/repos/${REPO}/releases/tags/${tag}`;

// Exact names — `biome-linux-x64-musl` must not match `biome-linux-x64`.
const ASSET_BY_PLATFORM = {
  "linux-x64": "biome-linux-x64",
  "linux-arm64": "biome-linux-arm64",
  "darwin-x64": "biome-darwin-x64",
  "darwin-arm64": "biome-darwin-arm64",
};

async function run() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    if (tag !== "latest" && response.status === 404) {
      throw new Error(`No release found for tag ${tag} — publish it first`);
    }
    throw new Error(`Failed to get release data: ${response.status}`);
  }

  const release = await response.json();

  console.log(`Found release: ${release.tag_name}`);

  if (process.platform === "win32") {
    console.error("Windows is not supported yet");
    process.exit(1);
  }

  const arch = process.arch === "arm64" ? "arm64" : "x64";
  const assetName = ASSET_BY_PLATFORM[`${process.platform}-${arch}`];

  if (!assetName) {
    throw new Error(`Unsupported platform: ${process.platform}-${arch}`);
  }

  const asset = release.assets.find((a) => a.name === assetName);

  if (!asset) {
    throw new Error(`Could not find asset ${assetName} in release ${release.tag_name}`);
  }

  console.log(`Downloading ${asset.name}`);

  const binPath = resolve(import.meta.dirname, "..", "bin");
  await mkdir(binPath, { recursive: true });

  const target = resolve(binPath, "biome");
  const res = await fetch(asset.browser_download_url);

  if (!res.ok || !res.body) {
    throw new Error(`Failed to download binary: ${res.status}`);
  }

  await pipeline(res.body, createWriteStream(target));
  await chmod(target, 0o755);

  console.log(`Installed to ${target}`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
