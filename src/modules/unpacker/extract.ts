import AdmZip from "adm-zip";

export async function extractZip(filePath: string, destDir: string): Promise<void> {
  const zip = new AdmZip(filePath);
  zip.extractAllTo(destDir, true);
}
