export default function ConfirmModal({ title, message, confirmLabel = "Confirm", onConfirm, onCancel, danger }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">{title}</h3>
        <p className="modal__message">{message}</p>
        <div className="modal__actions">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? "btn--danger" : "btn--accent"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
