export default function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }) {
  return (
    <div className="date-range-picker">
      <label className="form-label" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        From:
        <input type="date" className="input" style={{ width: "auto" }} value={startDate} onChange={(e) => onStartChange(e.target.value)} />
      </label>
      <label className="form-label" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        To:
        <input type="date" className="input" style={{ width: "auto" }} value={endDate} onChange={(e) => onEndChange(e.target.value)} />
      </label>
    </div>
  );
}
