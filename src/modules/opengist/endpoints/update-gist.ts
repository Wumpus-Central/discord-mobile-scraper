import type { Gist } from "../types.js";
import type { GistUpdateRequest } from "../types.js";
import { request } from "../client.js";

export function updateGist(uuid: string, data: GistUpdateRequest): Promise<Gist> {
  return request<Gist>(`/gists/${uuid}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
