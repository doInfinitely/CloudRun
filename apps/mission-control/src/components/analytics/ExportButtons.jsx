import { exportCSV } from "../../services/api";

const DATASETS = ["orders", "drivers", "merchants", "customers"];

export default function ExportButtons() {
  return (
    <div className="export-buttons">
      <span className="text-muted" style={{ fontSize: 12 }}>Export CSV:</span>
      {DATASETS.map((ds) => (
        <a key={ds} href={exportCSV(ds)} download className="btn btn--small">
          {ds}
        </a>
      ))}
      <button className="btn btn--small" onClick={() => window.print()}>Print / PDF</button>
    </div>
  );
}
