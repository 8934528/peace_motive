import { useShortcuts } from "../hooks/useShortcuts";
import { IconButton, X } from "../icons/GameIcons";

export type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmActionModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  busy = false,
  onConfirm,
  onCancel
}: ConfirmActionModalProps) {
  useShortcuts(
    {
      SUBMIT: () => {
        if (!busy) {
          onConfirm();
        }
      }
    },
    open
  );

  if (!open) return null;

  return (
    <div className="modal-backdrop-custom" role="dialog" aria-modal="true">
      <div className="modal-card modal-card-sm">
        <div className="modal-card-header">
          <h3>{title}</h3>
          <IconButton tooltip="Close" onClick={onCancel} disabled={busy}>
            <X size={16} />
          </IconButton>
        </div>
        <div className="modal-card-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-card-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              variant === "danger" ? "danger-button" : "primary-button"
            }
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
