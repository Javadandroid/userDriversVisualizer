import type { CellTowerMarker } from "../types";

export interface BoundingBox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export async function fetchTowersByBounds(
  bounds: BoundingBox,
  limit: number = 50
): Promise<CellTowerMarker[]> {
  const response = await fetch(`${API_BASE}/api/towers/within/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...bounds,
      limit,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch towers");
  }

  return (await response.json()) as CellTowerMarker[];
}
