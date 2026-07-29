import type { Gist } from "../types.js";
import { request } from "../client.js";

export function getGist(uuid: string): Promise<Gist> {
  return request<Gist>(`/gists/${uuid}`);
}
