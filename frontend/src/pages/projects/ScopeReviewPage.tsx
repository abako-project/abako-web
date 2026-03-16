/**
 * ScopeReviewPage - Client review of the proposed project scope and milestones
 *
 * Allows the client to review the consultant's proposed milestones and either
 * accept or reject the scope.
 *
 * Route: /projects/:id/review-scope
 *
 * Accept flow:
 *   1. Check DUSD balance via useDusdBalance
 *   2. If insufficient → navigate to /payments/:id/fund (on-ramp page)
 *   3. If sufficient → create escrow (Payments.pay) → acceptScope → navigate /projects/:id
 *
 * Reject flow:
 *   useRejectScope() → navigate back /projects/:id
 */

import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProject } from '@hooks/useProjects';
import { useAcceptScope, useRejectScope } from '@hooks/useScope';
import { useDusdBalance } from '@hooks/useKrvxBalance';
import { useAuthStore } from '@/stores/authStore';
import { getUserAddress } from '@/api/virto';
import { Button, Card, CardContent, Spinner } from '@components/ui';
import {
  EscrowPaymentModal,
  isEscrowModalDismissed,
} from '@components/features/payments/EscrowPaymentModal';
import { cn } from '@lib/cn';
import { budgetPlanckToHuman } from '@lib/dusdUnits';
import type { Milestone, Project } from '@/types/index';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '$0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDeliveryDate(
  deliveryDate?: Date | number | string
): string {
  if (!deliveryDate) return 'TBD';
  const d = new Date(deliveryDate);
  if (isNaN(d.getTime())) return String(deliveryDate);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMilestoneDeliveryDate(
  deliveryDate?: string | number
): string {
  if (!deliveryDate) return 'TBD';
  const d = new Date(deliveryDate);
  if (isNaN(d.getTime())) return String(deliveryDate);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function resolveBudgetLabel(
  budget: string | number | undefined,
  allBudgets: Array<{ id: number; description: string }>
): string {
  if (budget === undefined || budget === null) return 'Not specified';
  if (typeof budget === 'number') {
    return allBudgets[budget]?.description ?? 'Not specified';
  }
  const numVal = Number(budget);
  if (!isNaN(numVal)) {
    return allBudgets[numVal]?.description ?? String(budget);
  }
  return String(budget);
}

// ---------------------------------------------------------------------------
// ScopeReviewPage
// ---------------------------------------------------------------------------

type Decision = 'accept' | 'reject' | null;

export default function ScopeReviewPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useProject(id);
  const { mutate: acceptScope, isPending: isAccepting } = useAcceptScope();
  const { mutate: rejectScope, isPending: isRejecting } = useRejectScope();

  const user = useAuthStore((s) => s.user);
  const [userAddress, setUserAddress] = React.useState<string | null>(null);
  const [addressError, setAddressError] = React.useState<string | null>(null);

  const dusdBalance = useDusdBalance(userAddress);

  const [decision, setDecision] = React.useState<Decision>(null);
  const [clientComment, setClientComment] = React.useState('');
  const [showEscrowModal, setShowEscrowModal] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = React.useState(false);

  // Fetch user's blockchain address on mount
  React.useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;

    getUserAddress(user.email)
      .then((res) => {
        if (!cancelled) setUserAddress(res.address);
      })
      .catch(() => {
        if (!cancelled) setAddressError('Could not resolve blockchain account');
      });

    return () => { cancelled = true; };
  }, [user?.email]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  function handleCopyEmail(email: string): void {
    void navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  }

  async function handleSubmit(): Promise<void> {
    if (!id || !data || !decision) return;
    setSubmitError(null);

    if (decision === 'reject') {
      rejectScope(
        { projectId: id, clientResponse: clientComment },
        {
          onSuccess: () => navigate(`/projects/${id}`),
          onError: (err) => setSubmitError(err.message),
        }
      );
      return;
    }

    // --- Accept flow ---
    const totalCost = data.project.milestones.reduce(
      (acc, m) => acc + budgetPlanckToHuman(m.budget),
      0
    );

    // Check if user has enough DUSD
    const hasFunds = dusdBalance.data?.hasSufficientFunds(totalCost) ?? false;
    if (!hasFunds) {
      // Navigate to on-ramp page — user needs to deposit the full project cost.
      // Using the total (not the difference) avoids issues when the balance
      // changes between navigation and the on-ramp API call.
      if (isEscrowModalDismissed()) {
        navigate(`/payments/${id}/fund`, { state: { totalCost } });
      } else {
        setShowEscrowModal(true);
      }
      return;
    }

    // Accept scope — the backend's approve_scope() contract call handles
    // transferring DUSD from the client's wallet to the project contract.
    // No separate escrow creation needed.
    acceptScope(
      { projectId: id, clientResponse: clientComment },
      {
        onSuccess: () => navigate(`/projects/${id}`),
        onError: (err) => setSubmitError(err.message),
      }
    );
  }

  function handleEscrowModalClose(): void {
    setShowEscrowModal(false);
    const totalCostForModal = data
      ? data.project.milestones.reduce((acc, m) => acc + budgetPlanckToHuman(m.budget), 0)
      : 0;
    navigate(`/payments/${id}/fund`, { state: { totalCost: totalCostForModal } });
  }

  // --------------------------------------------------------------------------
  // Loading / error states
  // --------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-[rgba(255,255,255,0.7)]">Loading scope...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-8 py-10 lg:px-14">
        <div className="mx-auto max-w-2xl rounded-[12px] border border-red-500/30 bg-[#231f1f] p-8 text-center">
          <i className="ri-error-warning-line mb-3 block text-4xl text-red-400" />
          <h2 className="mb-2 text-xl font-bold text-[#f5f5f5]">
            Failed to load project scope
          </h2>
          <p className="mb-4 text-[rgba(255,255,255,0.7)]">
            {error?.message ?? 'Project not found or you do not have access.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => void refetch()}
              className="rounded-[12px] bg-[#36d399] px-4 py-2 font-medium text-[#141414] transition-shadow hover:shadow-lg"
            >
              Retry
            </button>
            <Link
              to="/projects"
              className="rounded-[12px] border border-[#3d3d3d] px-4 py-2 text-[rgba(255,255,255,0.7)] transition-colors hover:border-[#555]"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { project, allBudgets } = data;
  const isMutating = isAccepting || isRejecting;

  const totalCost = project.milestones.reduce(
    (acc, m) => acc + budgetPlanckToHuman(m.budget),
    0
  );

  const hasSufficientFunds = dusdBalance.data?.hasSufficientFunds(totalCost) ?? false;

  const consultantComment =
    project.comments?.[project.comments.length - 1]?.consultantComment ?? '';

  const budgetLabel = resolveBudgetLabel(project.budget, allBudgets);

  // Resolve accept button text based on balance
  const acceptButtonText = decision === 'accept' && !hasSufficientFunds
    ? 'Fund & Accept Scope'
    : 'Submit Response';

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      <EscrowPaymentModal
        isOpen={showEscrowModal}
        onClose={handleEscrowModalClose}
      />

      <div
        className="min-h-screen px-8 py-10 lg:px-14"
        style={{ background: 'var(--base-surface-1, #141414)' }}
      >
        {/* Back navigation */}
        <nav className="mb-6">
          <Link
            to={`/projects/${project.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.7)] transition-colors hover:text-[#f5f5f5]"
          >
            <i className="ri-arrow-left-line" aria-hidden="true" />
            {project.title}
          </Link>
        </nav>

        {/* Page header with title + accept/reject controls */}
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <h1
            className="text-2xl font-bold text-[#f5f5f5] lg:text-[28px]"
            style={{ fontFamily: 'Inter' }}
          >
            Review the Project Scope and Milestones
          </h1>

          {/* Decision toggle + submit */}
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {/* Accept toggle button */}
            <button
              type="button"
              onClick={() => setDecision(decision === 'accept' ? null : 'accept')}
              className={cn(
                'inline-flex items-center gap-2 rounded-[12px] border px-4 py-2 text-sm font-medium transition-all',
                decision === 'accept'
                  ? 'border-[#36d399] bg-[#36d399]/10 text-[#36d399]'
                  : 'border-[#3d3d3d] text-[rgba(255,255,255,0.7)] hover:border-[#555] hover:text-[#f5f5f5]'
              )}
              aria-pressed={decision === 'accept'}
            >
              <i className="ri-checkbox-circle-line" aria-hidden="true" />
              Accept
            </button>

            {/* Reject toggle button */}
            <button
              type="button"
              onClick={() => setDecision(decision === 'reject' ? null : 'reject')}
              className={cn(
                'inline-flex items-center gap-2 rounded-[12px] border px-4 py-2 text-sm font-medium transition-all',
                decision === 'reject'
                  ? 'border-red-500 bg-red-500/10 text-red-400'
                  : 'border-[#3d3d3d] text-[rgba(255,255,255,0.7)] hover:border-[#555] hover:text-[#f5f5f5]'
              )}
              aria-pressed={decision === 'reject'}
            >
              <i className="ri-close-circle-line" aria-hidden="true" />
              Reject
            </button>

            {/* Submit button */}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleSubmit()}
              disabled={decision === null || isMutating}
              isLoading={isMutating}
              className={cn(
                'min-w-[140px]',
                decision === null && 'opacity-50'
              )}
            >
              {acceptButtonText}
            </Button>
          </div>
        </div>

        {/* Error feedback */}
        {(submitError || addressError) && (
          <div className="mb-6 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <i className="ri-error-warning-line mr-2" aria-hidden="true" />
            {submitError ?? addressError}
          </div>
        )}

        {/* DUSD Balance indicator (shown when accept is selected) */}
        {decision === 'accept' && (
          <BalanceIndicator
            dusdFree={dusdBalance.data?.dusdFree}
            isLoading={dusdBalance.isLoading}
            totalCost={totalCost}
            hasSufficientFunds={hasSufficientFunds}
          />
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)]">
          {/* LEFT COLUMN — Milestones & Cost */}
          <MilestonesCard project={project} totalCost={totalCost} />

          {/* RIGHT COLUMN — Consultant Proposal */}
          <ConsultantProposalCard
            project={project}
            totalCost={totalCost}
            budgetLabel={budgetLabel}
            consultantComment={consultantComment}
            clientComment={clientComment}
            onClientCommentChange={setClientComment}
            onCopyEmail={handleCopyEmail}
            copiedEmail={copiedEmail}
          />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// BalanceIndicator
// ---------------------------------------------------------------------------

interface BalanceIndicatorProps {
  dusdFree: string | undefined;
  isLoading: boolean;
  totalCost: number;
  hasSufficientFunds: boolean;
}

function BalanceIndicator({ dusdFree, isLoading, totalCost, hasSufficientFunds }: BalanceIndicatorProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-[12px] border border-[#3d3d3d] bg-[#231f1f] px-4 py-3 text-sm text-[rgba(255,255,255,0.7)]">
        <Spinner size="sm" />
        <span>Checking DUSD balance...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mb-6 flex items-center gap-3 rounded-[12px] border px-4 py-3 text-sm',
        hasSufficientFunds
          ? 'border-[#36d399]/30 bg-[#36d399]/10 text-[#36d399]'
          : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
      )}
    >
      <i
        className={hasSufficientFunds ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}
        aria-hidden="true"
      />
      <span>
        DUSD Balance: <strong>{dusdFree ?? '0'}</strong>
        {' · '}
        Required: <strong>{totalCost.toFixed(3)}</strong>
        {hasSufficientFunds
          ? <span className="ml-2">— Sufficient balance to fund escrow</span>
          : <span className="ml-2">— You need {(totalCost - parseFloat(dusdFree ?? '0')).toFixed(0)} more DUSD</span>
        }
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MilestonesCard
// ---------------------------------------------------------------------------

interface MilestonesCardProps {
  project: Project;
  totalCost: number;
}

function MilestonesCard({ project, totalCost }: MilestonesCardProps): React.JSX.Element {
  return (
    <Card className="rounded-[12px] border-[#3d3d3d] bg-[#231f1f]">
      <CardContent className="p-6">
        <h2
          className="text-lg font-semibold text-[#f5f5f5]"
          style={{ fontFamily: 'Inter' }}
        >
          Milestones &amp; Cost
        </h2>

        {project.milestones.length === 0 ? (
          <p className="mt-6 py-6 text-center text-sm text-[rgba(255,255,255,0.5)]">
            No milestones have been defined yet.
          </p>
        ) : (
          <div className="mt-4">
            {project.milestones.map((milestone, index) => (
              <MilestoneItem
                key={milestone.id ?? `ms-${index}`}
                milestone={milestone}
                index={index}
                isLast={index === project.milestones.length - 1}
              />
            ))}
          </div>
        )}

        {/* Total section */}
        {project.milestones.length > 0 && (
          <div className="mt-4 border-t border-[#3d3d3d] pt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[rgba(255,255,255,0.7)]">
                Total Cost
              </span>
              <span className="text-base font-bold text-[#36d399]">
                {formatCurrency(totalCost)}
              </span>
            </div>
            {project.deliveryDate && (
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[rgba(255,255,255,0.7)]">
                  Delivery time
                </span>
                <span className="text-sm text-[#f5f5f5]">
                  {formatDeliveryDate(project.deliveryDate)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// MilestoneItem
// ---------------------------------------------------------------------------

interface MilestoneItemProps {
  milestone: Milestone;
  index: number;
  isLast: boolean;
}

function MilestoneItem({ milestone, index, isLast }: MilestoneItemProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'py-5',
        !isLast && 'border-b border-[#3d3d3d]'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: labels */}
        <div className="min-w-0 flex-1">
          {/* Milestone label */}
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
            Milestone {index + 1}
          </p>

          {/* Title */}
          <p
            className="mb-1.5 text-sm font-semibold text-[#f5f5f5]"
            style={{ fontFamily: 'Inter' }}
          >
            {milestone.title}
          </p>

          {/* Description */}
          {milestone.description && (
            <p className="mb-3 text-sm leading-relaxed text-[rgba(255,255,255,0.7)]">
              {milestone.description}
            </p>
          )}

          {/* Developer role + availability */}
          {(milestone.role ?? milestone.availability) && (
            <div className="flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.5)]">
              <i className="ri-user-3-line text-sm" aria-hidden="true" />
              {milestone.role && (
                <span className="font-medium text-[rgba(255,255,255,0.7)]">
                  {milestone.role}
                </span>
              )}
              {milestone.availability && (
                <>
                  <span className="text-[rgba(255,255,255,0.3)]">·</span>
                  <span>
                    {milestone.availability === 'FullTime'
                      ? 'Full-Time'
                      : milestone.availability === 'PartTime'
                      ? 'Part-Time'
                      : milestone.availability}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: budget + delivery date */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {milestone.budget !== null && milestone.budget !== undefined && (
            <span className="text-sm font-semibold text-[#f5f5f5]">
              {formatCurrency(budgetPlanckToHuman(milestone.budget))}
            </span>
          )}
          {milestone.deliveryDate && (
            <span className="text-xs text-[rgba(255,255,255,0.5)]">
              {formatMilestoneDeliveryDate(milestone.deliveryDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConsultantProposalCard
// ---------------------------------------------------------------------------

interface ConsultantProposalCardProps {
  project: Project;
  totalCost: number;
  budgetLabel: string;
  consultantComment: string;
  clientComment: string;
  onClientCommentChange: (value: string) => void;
  onCopyEmail: (email: string) => void;
  copiedEmail: boolean;
}

function ConsultantProposalCard({
  project,
  totalCost,
  budgetLabel,
  consultantComment,
  clientComment,
  onClientCommentChange,
  onCopyEmail,
  copiedEmail,
}: ConsultantProposalCardProps): React.JSX.Element {
  const consultant = project.consultant;
  const consultantName = consultant?.name ?? 'Project Leader';
  const consultantEmail = consultant?.email;

  return (
    <Card className="rounded-[12px] border-[#3d3d3d] bg-[#231f1f]">
      <CardContent className="p-6">
        {/* Header: consultant avatar + name */}
        <div className="flex items-start gap-3">
          {/* Avatar circle with initials */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#36d399]/20 text-sm font-bold text-[#36d399]"
            aria-hidden="true"
          >
            {getInitials(consultantName)}
          </div>
          <div>
            <p
              className="text-sm font-semibold text-[#f5f5f5]"
              style={{ fontFamily: 'Inter' }}
            >
              {consultantName}&apos;s Proposal
            </p>
            <p className="text-xs text-[rgba(255,255,255,0.5)]">
              Your Project Leader
            </p>
          </div>
        </div>

        {/* Consultant message */}
        {consultantComment && (
          <div className="mt-4 rounded-[8px] border-l-[3px] border-[#36d399] bg-[#141414] p-4">
            <p className="text-sm leading-relaxed text-[rgba(255,255,255,0.8)]">
              {consultantComment}
            </p>
          </div>
        )}

        {!consultantComment && (
          <div className="mt-4 rounded-[8px] bg-[#141414] p-4">
            <p className="text-sm italic text-[rgba(255,255,255,0.4)]">
              No proposal comment provided.
            </p>
          </div>
        )}

        {/* Summary section */}
        <div className="mt-5 space-y-3 rounded-[8px] border border-[#3d3d3d] p-4">
          {/* Your budget */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-[rgba(255,255,255,0.5)]">
              Your budget
            </span>
            <span className="text-right text-sm font-medium text-[#f5f5f5]">
              {budgetLabel}
            </span>
          </div>
          {/* Project actual cost */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-[rgba(255,255,255,0.5)]">
              Project actual cost
            </span>
            <span className="text-right text-sm font-semibold text-[#36d399]">
              {formatCurrency(totalCost)}
            </span>
          </div>
          {/* Delivery date */}
          {project.deliveryDate && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-[rgba(255,255,255,0.5)]">
                Delivery Date
              </span>
              <span className="text-right text-sm text-[#f5f5f5]">
                {formatDeliveryDate(project.deliveryDate)}
              </span>
            </div>
          )}
        </div>

        {/* Add Comment textarea */}
        <div className="mt-5">
          <label
            htmlFor="client-comment"
            className="mb-1.5 block text-xs font-medium text-[rgba(255,255,255,0.7)]"
          >
            Add Comment{' '}
            <span className="text-[rgba(255,255,255,0.4)]">(optional)</span>
          </label>
          <textarea
            id="client-comment"
            rows={4}
            value={clientComment}
            onChange={(e) => onClientCommentChange(e.target.value)}
            placeholder="Share your thoughts with the project leader..."
            className={cn(
              'w-full resize-none rounded-[8px] border border-[#3d3d3d] bg-[#141414]',
              'px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[rgba(255,255,255,0.3)]',
              'outline-none transition-colors focus:border-[#36d399]'
            )}
          />
        </div>

        {/* Help section */}
        <div className="mt-5 rounded-[8px] border border-[#3d3d3d] p-4">
          <div className="flex items-start gap-2">
            <i
              className="ri-question-line mt-0.5 shrink-0 text-base text-[#36d399]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#f5f5f5]">
                Not sure if to accept or reject?
              </p>
              <p className="mt-0.5 text-xs text-[rgba(255,255,255,0.5)]">
                Contact the Project Leader to further investigate
              </p>
              {consultantEmail && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="truncate text-xs text-[#36d399]">
                    {consultantEmail}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCopyEmail(consultantEmail)}
                    className="shrink-0 text-[rgba(255,255,255,0.4)] transition-colors hover:text-[rgba(255,255,255,0.8)]"
                    aria-label="Copy email address"
                    title={copiedEmail ? 'Copied!' : 'Copy email'}
                  >
                    <i
                      className={
                        copiedEmail ? 'ri-check-line' : 'ri-clipboard-line'
                      }
                      aria-hidden="true"
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
