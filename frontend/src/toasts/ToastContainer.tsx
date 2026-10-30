import { useGame } from "../hooks/useGame";
import type { ToastItem } from "../types/gameTypes";
import { ErrorToast } from "./ErrorToast";

export function ToastContainer() {
  const { toasts, removeToast } = useGame();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast: ToastItem) => (
        <ErrorToast key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}
