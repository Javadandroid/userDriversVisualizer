import React, { useEffect, useRef, useState } from "react";
import {
  startImport,
  fetchImportStatus,
  ImportStatus,
} from "../services/towerService";

const DATASET_SOURCES = [
  { value: "MLS", label: "MLS" },
  { value: "OPENCELLID", label: "OpenCellID" },
  { value: "MANUAL", label: "Manual" },
  { value: "GOOGLE", label: "Google" },
  { value: "COMBAIN", label: "Combain" },
  { value: "OTHER", label: "Other" },
];

const ImportTowers: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<string>(DATASET_SOURCES[0].value);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const poll = async () => {
      try {
        const st = await fetchImportStatus(jobId);
        setStatus(st);
        if (st.status === "SUCCESS" || st.status === "FAILED") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch status");
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    poll();
    pollRef.current = window.setInterval(poll, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!file) {
      setError("Please choose a CSV file");
      return;
    }
    try {
      const resp = await startImport(file, source, updateExisting);
      setJobId(resp.job_id);
    } catch (err: any) {
      setError(err.message || "Failed to start import");
    }
  };

  const percent =
    status && status.total_rows
      ? Math.min(100, Math.round((status.processed_rows / status.total_rows) * 100))
      : 0;

  return (
    <div className="import-panel" style={styles.panel}>
      <h2 style={styles.title}>Import Cell Towers</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          CSV File
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
            style={styles.input}
          />
        </label>
        <label style={styles.label}>
          Source
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={styles.select}
          >
            {DATASET_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={updateExisting}
            onChange={(e) => setUpdateExisting(e.target.checked)}
          />
          Update existing records
        </label>
        <button type="submit" style={styles.button}>
          Start Import
        </button>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {status && (
        <div style={styles.statusBox}>
          <div style={styles.statusRow}>
            <span>Status:</span> <strong>{status.status}</strong>
          </div>
          <div style={styles.progressBarOuter}>
            <div
              style={{
                ...styles.progressBarInner,
                width: `${percent}%`,
              }}
            />
          </div>
          <div style={styles.statusRow}>
            {status.processed_rows} / {status.total_rows} rows ({percent}%)
          </div>
          {status.last_updates && status.last_updates.length > 0 && (
            <div style={styles.tableWrap}>
              <div style={styles.tableHeader}>Recent updates</div>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Action</th>
                    <th>Old samples</th>
                    <th>New samples</th>
                    <th>Old coords</th>
                    <th>New coords</th>
                  </tr>
                </thead>
                <tbody>
                  {status.last_updates.map((u, idx) => (
                    <tr key={idx}>
                      <td>
                        {u.key.mcc}-{u.key.mnc}-{u.key.cell_id}-{u.key.lac ?? "∅"}
                      </td>
                      <td>{u.action}</td>
                      <td>{u.old_samples ?? "—"}</td>
                      <td>{u.new_samples ?? "—"}</td>
                      <td>
                        {u.old_lat ?? "—"},{u.old_lon ?? "—"}
                      </td>
                      <td>
                        {u.new_lat ?? "—"},{u.new_lon ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: "linear-gradient(135deg, #0f172a, #1e293b)",
    color: "#e2e8f0",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    maxWidth: "900px",
    margin: "20px auto",
  },
  title: { marginBottom: 12 },
  form: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
    gap: "12px",
    alignItems: "end",
  },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 14 },
  input: { background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8, padding: 8 },
  select: { background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155", borderRadius: 8, padding: 8 },
  checkbox: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 },
  button: {
    background: "#06b6d4",
    color: "#0f172a",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform 0.1s ease",
  },
  error: { marginTop: 12, color: "#f87171" },
  statusBox: { marginTop: 16, padding: 12, background: "#0b1221", borderRadius: 12 },
  statusRow: { marginTop: 6 },
  progressBarOuter: {
    marginTop: 8,
    height: 10,
    background: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarInner: {
    height: "100%",
    background: "linear-gradient(90deg, #22d3ee, #6366f1)",
    transition: "width 0.4s ease",
  },
  tableWrap: { marginTop: 12, background: "#0f172a", borderRadius: 10, padding: 10 },
  tableHeader: { marginBottom: 6, fontWeight: 600 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  tableCell: { padding: "4px 6px" },
};

export default ImportTowers;
