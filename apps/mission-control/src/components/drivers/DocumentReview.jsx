import { reviewDocument } from "../../services/api";
import StatusBadge from "../common/StatusBadge";

export default function DocumentReview({ driverId, documents, onRefresh }) {
  if (!documents || documents.length === 0) {
    return <p className="text-muted" style={{ fontSize: 13 }}>No documents uploaded</p>;
  }

  const handleReview = async (docId, action) => {
    try {
      await reviewDocument(driverId, docId, action);
      onRefresh?.();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="doc-review">
      {documents.map((doc) => (
        <div key={doc.id} className="doc-review__item">
          <div className="doc-review__info">
            <span className="doc-review__type">{doc.doc_type}</span>
            <StatusBadge status={doc.status} small />
            {doc.vehicle_id && <span className="text-muted" style={{ fontSize: 11 }}>Vehicle: {doc.vehicle_id.slice(0, 12)}</span>}
          </div>
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn--small">View File</a>
          )}
          {doc.status === "PENDING" && (
            <div className="doc-review__actions">
              <button className="btn btn--success btn--small" onClick={() => handleReview(doc.id, "approve")}>Approve</button>
              <button className="btn btn--danger btn--small" onClick={() => handleReview(doc.id, "reject")}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
