"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
};

export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  description,
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="confirm-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(32,34,35,0.34)] px-4"
      role="dialog"
    >
      <button
        aria-label="Close confirmation dialog"
        className="absolute inset-0 cursor-default"
        disabled={loading}
        onClick={onCancel}
        type="button"
      />
      <div className="card-surface relative w-full max-w-md overflow-hidden border border-[rgba(32,34,35,0.08)] bg-[var(--surface)] shadow-[0_28px_60px_rgba(32,34,35,0.18)]">
        <div className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#fafbfb_100%)] px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Confirm Action
          </p>
          <h2
            className="display-font mt-1 text-xl font-semibold text-[var(--foreground)]"
            id="confirm-dialog-title"
          >
            {title}
          </h2>
        </div>
        <div className="px-6 py-5">
          {description ? (
            <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">{description}</p>
          ) : null}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              className="btn btn-secondary min-w-24 shadow-sm"
              disabled={loading}
              onClick={onCancel}
              type="button"
            >
              {cancelLabel}
            </button>
            <button
              className="btn btn-danger min-w-28 shadow-sm"
              disabled={loading}
              onClick={onConfirm}
              type="button"
            >
              {loading ? "Deleting..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
