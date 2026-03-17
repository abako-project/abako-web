/**
 * ConfirmDialog - Accessible confirmation modal
 *
 * A generic confirmation dialog rendered via a React portal.
 * Implements focus trapping, Escape-key dismissal, and overlay-click dismissal.
 * Meets WCAG 2.1 AA requirements via aria-modal and role="alertdialog".
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={isOpen}
 *     title="Delete item"
 *     description="This action cannot be undone."
 *     confirmLabel="Delete"
 *     confirmVariant="danger"
 *     isLoading={isPending}
 *     onConfirm={handleConfirm}
 *     onCancel={() => setIsOpen(false)}
 *   />
 */

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@lib/cn';

export interface ConfirmDialogProps {
  /** Controls whether the dialog is visible. */
  isOpen: boolean;
  /** Called when the user confirms the action. */
  onConfirm: () => void;
  /** Called when the user cancels (Escape, overlay click, or Cancel button). */
  onCancel: () => void;
  /** Dialog heading. */
  title: string;
  /** Descriptive body text explaining the consequence of the action. */
  description: string;
  /** Label for the confirm button. */
  confirmLabel?: string;
  /** Visual style of the confirm button. */
  confirmVariant?: 'danger' | 'primary';
  /** When true, the confirm button shows a loading spinner. */
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  isLoading = false,
}: ConfirmDialogProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when the dialog opens (safer default for destructive actions)
  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      // Focus trap: keep Tab navigation inside the dialog
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first: HTMLElement | undefined = focusable[0];
      const last: HTMLElement | undefined = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    },
    [onCancel]
  );

  if (!isOpen) return null;

  const confirmButtonStyles = cn(
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    confirmVariant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
      : 'bg-[#36D399] text-[#141414] hover:bg-[#2dc48a] focus-visible:ring-[#36D399]'
  );

  const cancelButtonStyles = cn(
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors',
    'border border-[#3D3D3D] text-[#9B9B9B] hover:border-[#555] hover:text-[#F5F5F5]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#555]',
    'disabled:pointer-events-none disabled:opacity-50'
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className={cn(
          'relative z-10 w-full max-w-md mx-4',
          'rounded-xl border border-[#3D3D3D] bg-[#231F1F]',
          'p-6 shadow-2xl'
        )}
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-3">
          {confirmVariant === 'danger' && (
            <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <i className="ri-alert-line text-xl text-red-400" aria-hidden="true" />
            </div>
          )}
          <div>
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold text-[#F5F5F5] leading-snug"
            >
              {title}
            </h2>
          </div>
        </div>

        {/* Description */}
        <p
          id="confirm-dialog-description"
          className="text-sm text-[#9B9B9B] mb-6"
        >
          {description}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className={cancelButtonStyles}
          >
            Cancel
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={confirmButtonStyles}
          >
            {isLoading ? (
              <>
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
