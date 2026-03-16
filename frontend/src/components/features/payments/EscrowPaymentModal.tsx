/**
 * EscrowPaymentModal - First-time escrow explainer modal
 *
 * Shown once per user (controlled by localStorage) to explain how the
 * escrow payment system works before they proceed to fund a project.
 *
 * Features:
 *   - 4-step vertical timeline layout (Figma 1067:11386)
 *   - Left green circle icon with connector lines between steps
 *   - Right card with left green border accent for each step
 *   - "Don't show again" checkbox persisted in localStorage
 *   - Escape key + overlay click dismissal
 *   - Focus trap for accessibility
 */

import * as React from 'react';
import { cn } from '@lib/cn';
import { Button } from '@components/ui';

const STORAGE_KEY = 'escrow-modal-dismissed';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EscrowPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: navigate to payment page after the user clicks "Understood". */
  onProceedToPayment?: () => void;
}

interface EscrowStep {
  icon: string;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const ESCROW_STEPS: EscrowStep[] = [
  {
    icon: 'ri-file-list-3-line',
    title: 'You fund via bank transfer',
    description:
      'Your fiat payment is converted to DUSD tokens on the Kreivo blockchain. This happens automatically when you complete the bank transfer.',
  },
  {
    icon: 'ri-lock-line',
    title: 'Tokens are locked in escrow',
    description:
      'DUSD tokens are locked on the Kreivo blockchain via the Payments pallet. The funds are held securely until you approve the deliverables.',
  },
  {
    icon: 'ri-checkbox-circle-line',
    title: 'You approve the result',
    description:
      'Once you\'re happy with the delivery of the milestones, you release the payment from escrow. Only then do the consultant and the team get paid.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'You\'re protected',
    description:
      'If there\'s a dispute or issue, our support team can step in to help resolve it fairly before funds are released.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true when the user previously dismissed this modal. */
export function isEscrowModalDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EscrowPaymentModal({
  isOpen,
  onClose,
  onProceedToPayment,
}: EscrowPaymentModalProps) {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // --------------------------------------------------------------------------
  // Keyboard handling + focus trap
  // --------------------------------------------------------------------------

  React.useEffect(() => {
    if (!isOpen) return;

    // Move focus into the modal when it opens
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableSelectors =
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const focusableElements = Array.from(
        modal.querySelectorAll<HTMLElement>(focusableSelectors)
      );

      if (focusableElements.length === 0) return;

      const first = focusableElements[0] as HTMLElement;
      const last = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Prevent body scroll while modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  function handleClose() {
    if (dontShowAgain) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // localStorage may be unavailable in some environments
      }
    }
    onClose();
  }

  function handleUnderstood() {
    handleClose();
    onProceedToPayment?.();
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="escrow-modal-title"
    >
      <div
        ref={modalRef}
        className={cn(
          'w-full max-w-lg rounded-[12px] border border-[#3d3d3d] bg-[#231f1f] p-8',
          'shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
        )}
      >
        {/* Header */}
        <div className="mb-6">
          <h2
            id="escrow-modal-title"
            className="text-xl font-semibold text-[#f5f5f5]"
            style={{ fontFamily: 'Inter' }}
          >
            Escrow Payment
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[rgba(255,255,255,0.7)]">
            Lock your funds in order for the project coordinator to be able to
            set up the team and start working on the project. We use escrow to
            protect both you and the development team.
          </p>
        </div>

        {/* Vertical timeline */}
        <div className="flex flex-col">
          {ESCROW_STEPS.map((step, index) => {
            const isLast = index === ESCROW_STEPS.length - 1;
            return (
              <div key={step.title} className="flex gap-4">
                {/* Left column: icon circle + connector line */}
                <div className="flex flex-col items-center">
                  {/* Icon circle */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      'border-2 border-[#36d399] bg-[#36d399]/10'
                    )}
                  >
                    <i
                      className={cn(step.icon, 'text-base text-[#36d399]')}
                      aria-hidden="true"
                    />
                  </div>
                  {/* Connector line (not shown after last step) */}
                  {!isLast && (
                    <div className="my-1 w-px flex-1 border-l-2 border-dashed border-[#36d399]/40" />
                  )}
                </div>

                {/* Right column: step card */}
                <div
                  className={cn(
                    'mb-3 min-w-0 flex-1 rounded-[8px] border border-[#3d3d3d] bg-[#141414]',
                    'border-l-4 border-l-[#36d399] px-4 py-3',
                    isLast && 'mb-0'
                  )}
                >
                  <p
                    className="mb-1 text-sm font-semibold text-[#f5f5f5]"
                    style={{ fontFamily: 'Inter' }}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.6)]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* "Don't show again" checkbox */}
        <div className="mt-6 flex items-center gap-2">
          <input
            ref={checkboxRef}
            id="escrow-dont-show"
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className={cn(
              'h-4 w-4 cursor-pointer rounded border-[#3d3d3d] bg-[#1a1a1a]',
              'accent-[#36d399] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36d399]'
            )}
          />
          <label
            htmlFor="escrow-dont-show"
            className="cursor-pointer select-none text-sm text-[rgba(255,255,255,0.7)]"
          >
            Don&apos;t Show Again
          </label>
        </div>

        {/* CTA button */}
        <Button
          ref={closeButtonRef}
          variant="primary"
          className="mt-4 w-full"
          onClick={handleUnderstood}
        >
          Understood
        </Button>
      </div>
    </div>
  );
}
