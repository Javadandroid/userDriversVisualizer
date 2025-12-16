import type { MatchSnapshotResponse, TrackedPoint, MatchPair } from "../types";

export interface MatchSnapshotOptions {
  endpoint: string;
  timeoutMs?: number;
}

function withTimeout(signal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

export async function fetchMatchSnapshot(
  options: MatchSnapshotOptions,
  signal?: AbortSignal
): Promise<MatchSnapshotResponse> {
  const endpoint = options.endpoint.trim();
  if (!endpoint) throw new Error("Endpoint is empty");

  const timeoutMs = options.timeoutMs ?? 12_000;
  const { signal: timeoutSignal, cleanup } = withTimeout(signal, timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: timeoutSignal,
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return (await res.json()) as MatchSnapshotResponse;
  } finally {
    cleanup();
  }
}

function randomAroundTehran(): { lat: number; lng: number } {
  // Tehran-ish box
  const lat = 35.65 + Math.random() * 0.15;
  const lng = 51.25 + Math.random() * 0.25;
  return { lat, lng };
}

export interface MockSnapshotConfig {
  driversCount: number;
  usersCount: number;
  matchesCount: number;
}

export function generateMockSnapshot(
  config: MockSnapshotConfig
): MatchSnapshotResponse {
  const drivers: TrackedPoint[] = Array.from({ length: config.driversCount }, (_, i) => {
    const { lat, lng } = randomAroundTehran();
    return { id: `driver_${i + 1}`, lat, lng };
  });
  const users: TrackedPoint[] = Array.from({ length: config.usersCount }, (_, i) => {
    const { lat, lng } = randomAroundTehran();
    return { id: `user_${i + 1}`, lat, lng };
  });

  const matchs: MatchPair[] = Array.from({ length: config.matchesCount }, (_, i) => {
    const driver = drivers[i % Math.max(1, drivers.length)].id;
    const user = users[(i * 3) % Math.max(1, users.length)].id;
    return { driver, user };
  });

  return { drivers, users, matchs };
}

