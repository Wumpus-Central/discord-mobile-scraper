import { logger } from "#src/logger.js";

const log = logger.child({ module: "opengist" });

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env["OPENGIST_URL"];
  const token = process.env["OPENGIST_TOKEN"];

  if (!baseUrl) {
    throw new Error("OPENGIST_URL is not set");
  }

  const url = `${baseUrl}/api${path}`;

  log.debug({ url, method: options.method ?? "GET" }, "Opengist API request");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.text();
    log.error({ status: res.status, body }, `Opengist API error: ${res.statusText}`);
    throw new Error(`Opengist API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  return data;
}
