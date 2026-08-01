import { createWriteStream } from "node:fs";
import { chmod, mkdir, rm } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const REPO = "SymbioticSec/hermes-decomp";
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

async function run() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Failed to get release data: ${response.status}`);
  }

  const release = await response.json();
  const tag = release.tag_name;

  console.log(`Found latest release: ${tag}`);

  const platform = process.platform;
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";

  let suffix = "";

  if (platform === "linux") {
    suffix = `linux-${arch}`;
  } else if (platform === "darwin") {
    suffix = `macos-${arch}`;
  } else if (platform === "win32") {
    suffix = "windows-x86_64";
    console.error("Windows is not supported yet");
    process.exit(1);
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const asset = release.assets.find((a) => a.name.includes(suffix));

  if (!asset) {
    throw new Error(`Could not find binary for: ${suffix}`);
  }

  console.log(`Downloading ${asset.name}`);

  const binPath = resolve(import.meta.dirname, "..", "bin");
  await mkdir(binPath, { recursive: true });

  const archivePath = resolve(binPath, asset.name);
  const writeStream = createWriteStream(archivePath);

  const res = await fetch(asset.browser_download_url);

  if (!res.ok || !res.body) {
    throw new Error(`Failed to download binary: ${res.status}`);
  }

  await pipeline(res.body, writeStream);

  console.log("Extracting...");
  execSync(`tar -xzf "${archivePath}" -C "${binPath}"`, { stdio: "inherit" });

  await chmod(resolve(binPath, "hermes-decomp"), 0o755);
  await rm(archivePath, { force: true });
  await rm(resolve(binPath, "hermes-mcp"), { force: true });

  console.log(`Installed to ${binPath}/hermes-decomp`);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
