import type React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "../icons/GameIcons";
import type { ToastItem } from "../types/gameTypes";

export type ErrorToastProps = {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  key?: React.Key;
};

export function ErrorToast({ toast, onDismiss }: ErrorToastProps) {
  return (
    <div
      className={`motive-toast toast-${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <span className="toast-icon">
        {toast.type === "error" ? (
          <AlertCircle size={15} />
        ) : toast.type === "success" ? (
          <CheckCircle2 size={15} />
        ) : (
          <Info size={15} />
        )}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        title="Close notification"
        aria-label="Close notification"
      >
        <X size={13} />
      </button>
    </div>
  );
}
