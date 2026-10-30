import type React from "react";

type EmptyStateProps = {
  title?: string;
  message: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {title && <strong className="empty-state-title">{title}</strong>}
      <p className="muted-copy">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-dot" />
      <span className="muted-copy">{message}</span>
    </div>
  );
}

