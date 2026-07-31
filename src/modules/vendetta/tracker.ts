import { VENDETTA_TRACKER, USER_AGENT } from "./index.js";

export interface TrackerResponse {
  latest: Record<string, number>;
}

export async function fetchTrackerIndex(): Promise<TrackerResponse> {
  const res = await fetch(`${VENDETTA_TRACKER}/index`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Tracker responded with ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as TrackerResponse;
}
