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

export interface ImportStartResponse {
  job_id: string;
  status: string;
}

export interface ImportStatus {
  id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  errors?: string[];
  last_updates?: Array<{
    key: { mcc: number; mnc: number; cell_id: number; lac: number | null };
    action: string;
    old_samples: number | null;
    new_samples: number | null;
    old_lat: number | null;
    old_lon: number | null;
    new_lat: number | null;
    new_lon: number | null;
  }>;
}

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="));
  return match ? decodeURIComponent(match.split("=")[1]) : undefined;
}

export async function startImport(
  csvFile: File,
  dataset_source: string,
  update_existing: boolean
): Promise<ImportStartResponse> {
  const formData = new FormData();
  formData.append("csv_file", csvFile);
  formData.append("dataset_source", dataset_source);
  formData.append("update_existing", String(update_existing));

  const response = await fetch(`${API_BASE}/api/towers/import-start/`, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: {
      "X-CSRFToken": getCsrfToken() || "",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to start import");
  }
  return (await response.json()) as ImportStartResponse;
}

export async function fetchImportStatus(jobId: string): Promise<ImportStatus> {
  const response = await fetch(`${API_BASE}/api/towers/import-status/${jobId}/`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch import status");
  }
  return (await response.json()) as ImportStatus;
}
