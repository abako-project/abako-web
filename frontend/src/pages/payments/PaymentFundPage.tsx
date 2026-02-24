/**
 * PaymentFundPage - On-ramp page for depositing DUSD via Bramp bank transfer
 *
 * This page is a pure on-ramp: the user deposits fiat and receives DUSD in
 * their wallet. It does NOT create escrow or approve scope — those happen
 * on ScopeReviewPage when the user has sufficient balance.
 *
 * Flow:
 *   Step 1 "review":       Show project milestones + DUSD balance + CTA
 *   Step 2 "bank-details": Call useBrampUser + useRequestDeposit → show IBAN/reference
 *   Step 3 "confirming":   Call useConfirmDeposit → deposit DUSD to wallet
 *   Step 4 "done":         Success message + "Back to Scope Review" link
 *   Step "error":          Error message + retry
 *
 * Route: /payments/:id/fund
 */

import * as React from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { usePayment } from '@hooks/usePayments';
import { useAuthStore } from '@/stores/authStore';
import { getUserAddress } from '@/api/virto';
import { useDusdBalance } from '@hooks/useKrvxBalance';
import { useBrampUser, useRequestDeposit, useConfirmDeposit } from '@hooks/useBramp';
import { useQueryClient } from '@tanstack/react-query';
import { walletKeys } from '@hooks/useWalletBalance';
import { budgetPlanckToHuman, dusdToPlanck } from '@lib/dusdUnits';
import {
  Button,
  Card,
  CardContent,
  Spinner,
} from '@components/ui';
import { cn } from '@lib/cn';
import type { Milestone } from '@/types/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FundingStep = 'review' | 'bank-details' | 'confirming' | 'done' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// ---------------------------------------------------------------------------
// PaymentFundPage
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Navigation state passed from ScopeReviewPage
// ---------------------------------------------------------------------------

interface FundNavigationState {
  totalCost?: number;
  currentBalance?: number;
  shortfall?: number;
}

export default function PaymentFundPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // State passed from ScopeReviewPage — contains the pre-computed shortfall
  const fundState = (location.state ?? null) as FundNavigationState | null;
  const { data, isLoading, error, refetch } = usePayment(id);

  const user = useAuthStore((s) => s.user);
  const [userAddress, setUserAddress] = React.useState<string | null>(null);
  const dusdBalance = useDusdBalance(userAddress);

  // Step machine
  const [step, setStep] = React.useState<FundingStep>('review');
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [depositId, setDepositId] = React.useState<number | null>(null);
  const [bankInstructions, setBankInstructions] = React.useState<{
    amount: string;
    bankAccount: string;
    reference: string;
  } | null>(null);

  // Hooks
  const brampUser = useBrampUser(user?.email);
  const requestDepositMutation = useRequestDeposit();
  const confirmDepositMutation = useConfirmDeposit();

  // Resolve user address on mount
  React.useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    getUserAddress(user.email)
      .then((res) => { if (!cancelled) setUserAddress(res.address); })
      .catch(() => { /* address resolution failure handled at action time */ });
    return () => { cancelled = true; };
  }, [user?.email]);

  // --------------------------------------------------------------------------
  // Loading / error states
  // --------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-[rgba(255,255,255,0.7)]">Loading payment details...</p>
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
            Failed to load payment details
          </h2>
          <p className="mb-4 text-[rgba(255,255,255,0.7)]">
            {error?.message ?? 'Payment information not found.'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => void refetch()}
              className="rounded-[12px] bg-[#36d399] px-4 py-2 font-medium text-[#141414] transition-shadow hover:shadow-lg"
            >
              Retry
            </button>
            <Link
              to="/payments"
              className="rounded-[12px] border border-[#3d3d3d] px-4 py-2 text-[rgba(255,255,255,0.7)] transition-colors hover:border-[#555]"
            >
              Back to Payments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { project } = data;
  const total = project.milestones.reduce(
    (acc, m) => acc + budgetPlanckToHuman(m.budget),
    0
  );

  // If we arrived from ScopeReviewPage with a pre-computed shortfall, use it.
  // Otherwise fall back to live balance data (if loaded) or the full total.
  const currentBalanceFromState = fundState?.currentBalance;
  const currentBalanceFromHook = dusdBalance.data?.dusdFree
    ? parseFloat(dusdBalance.data.dusdFree)
    : undefined;
  const resolvedCurrentBalance =
    currentBalanceFromState ?? currentBalanceFromHook ?? 0;
  const depositAmount =
    fundState?.shortfall !== undefined
      ? fundState.shortfall
      : Math.max(0, total - resolvedCurrentBalance);

  // --------------------------------------------------------------------------
  // Step handlers
  // --------------------------------------------------------------------------

  async function handleStartBankTransfer(): Promise<void> {
    if (!brampUser.data || !userAddress) {
      setStepError('Account not ready. Please wait for loading to complete.');
      setStep('error');
      return;
    }

    try {
      // Convert human-readable DUSD to raw planck units for the on-ramp API.
      // Use depositAmount (the shortfall) so the user only deposits what they're missing,
      // not the full project cost when they already have a partial balance.
      const rawAmount = dusdToPlanck(depositAmount);

      const result = await requestDepositMutation.mutateAsync({
        userId: brampUser.data.id,
        amount: String(rawAmount),
        toAddress: userAddress,
      });
      setDepositId(result.depositId);
      setBankInstructions(result.instructions);
      setStep('bank-details');
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Failed to request deposit');
      setStep('error');
    }
  }

  async function handleConfirmTransfer(): Promise<void> {
    if (depositId === null || !userAddress) return;

    setStep('confirming');
    try {
      await confirmDepositMutation.mutateAsync({
        depositId,
        toAddress: userAddress,
      });

      // Invalidate wallet balance queries so the UI reflects the new DUSD
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });

      setStep('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deposit confirmation failed';
      const isTimeout = message.includes('504') || message.includes('timeout') || message.includes('Timeout');

      if (isTimeout) {
        void queryClient.invalidateQueries({ queryKey: walletKeys.all });
        setStepError(
          'The request timed out, but the deposit may have been processed. ' +
          'Check your balance — it should update shortly.'
        );
      } else {
        setStepError(message);
      }

      setStep('error');
    }
  }

  function handleRetry(): void {
    setStepError(null);
    setStep('review');
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen px-8 py-10 lg:px-14"
      style={{ background: 'var(--base-surface-1, #141414)' }}
    >
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-[rgba(255,255,255,0.5)]">
        <Link
          to="/payments"
          className="transition-colors hover:text-[#f5f5f5]"
        >
          Payments
        </Link>
        <span className="mx-2">/</span>
        <Link
          to={`/projects/${project.id}/review-scope`}
          className="transition-colors hover:text-[#f5f5f5]"
        >
          {project.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#f5f5f5]">Deposit DUSD</span>
      </nav>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* LEFT COLUMN — Project Milestones */}
        <div>
          <Card className="rounded-[12px] border-[#3d3d3d] bg-[#231f1f]">
            <CardContent className="p-6">
              <h2
                className="text-lg font-semibold text-[#f5f5f5]"
                style={{ fontFamily: 'Inter' }}
              >
                Project Milestones
              </h2>
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.6)]">
                You need DUSD to fund this project. Deposit via bank transfer below.
              </p>

              {/* Milestone list */}
              <div className="mt-5">
                {project.milestones.length === 0 ? (
                  <p className="py-4 text-center text-sm text-[rgba(255,255,255,0.5)]">
                    No milestones defined yet.
                  </p>
                ) : (
                  project.milestones.map((milestone, index) => (
                    <SimpleMilestoneRow
                      key={milestone.id ?? `ms-${index}`}
                      milestone={milestone}
                      index={index}
                      isLast={index === project.milestones.length - 1}
                    />
                  ))
                )}
              </div>

              {/* Total box */}
              {project.milestones.length > 0 && (
                <div className="mt-4 rounded-[8px] border border-[#3d3d3d] px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-[#f5f5f5]">
                      Total
                    </span>
                    <span className="text-base font-bold text-[#36d399]">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN — Deposit Flow */}
        <div>
          <h2
            className="mb-4 text-lg font-semibold text-[#f5f5f5]"
            style={{ fontFamily: 'Inter' }}
          >
            Deposit DUSD via Bank Transfer
          </h2>

          {step === 'review' && (
            <DepositReviewStep
              total={total}
              depositAmount={depositAmount}
              currentBalance={resolvedCurrentBalance}
              dusdFree={dusdBalance.data?.dusdFree}
              isLoadingBalance={dusdBalance.isLoading}
              isLoadingUser={brampUser.isLoading}
              onStart={() => void handleStartBankTransfer()}
              isRequesting={requestDepositMutation.isPending}
            />
          )}

          {step === 'bank-details' && bankInstructions && (
            <BankTransferStep
              instructions={bankInstructions}
              onConfirm={() => void handleConfirmTransfer()}
              isConfirming={false}
            />
          )}

          {step === 'confirming' && <ConfirmingStep />}

          {step === 'done' && (
            <CompletedStep
              projectId={project.id}
              onBackToReview={() => navigate(`/projects/${project.id}/review-scope`)}
            />
          )}

          {step === 'error' && (
            <ErrorStep
              message={stepError ?? 'An unexpected error occurred'}
              onRetry={handleRetry}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SimpleMilestoneRowProps {
  milestone: Milestone;
  index: number;
  isLast: boolean;
}

function SimpleMilestoneRow({ milestone, index, isLast }: SimpleMilestoneRowProps): React.JSX.Element {
  const budget = budgetPlanckToHuman(milestone.budget);

  return (
    <div
      className={cn(
        'flex items-center justify-between py-3',
        !isLast && 'border-b border-[#3d3d3d]'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-xs text-[rgba(255,255,255,0.4)]">
          Milestone {index + 1}
        </p>
        <p className="truncate text-sm text-[#f5f5f5]">{milestone.title}</p>
      </div>
      <span className="ml-4 shrink-0 text-sm font-semibold text-[#f5f5f5]">
        {formatCurrency(budget)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DepositReviewStep
// ---------------------------------------------------------------------------

interface DepositReviewStepProps {
  /** Full project cost (sum of all milestones). Always shown for reference. */
  total: number;
  /** Amount the user actually needs to deposit (total minus existing balance). */
  depositAmount: number;
  /** Resolved current DUSD balance to display in the breakdown. */
  currentBalance: number;
  dusdFree: string | undefined;
  isLoadingBalance: boolean;
  isLoadingUser: boolean;
  onStart: () => void;
  isRequesting: boolean;
}

function DepositReviewStep({
  total,
  depositAmount,
  currentBalance,
  isLoadingBalance,
  isLoadingUser,
  onStart,
  isRequesting,
}: DepositReviewStepProps): React.JSX.Element {
  // Determine whether this is a partial top-up scenario
  const isPartialTopUp = currentBalance > 0 && depositAmount < total;

  return (
    <Card className="rounded-[12px] border-[#3d3d3d] bg-[#231f1f]">
      <CardContent className="p-6 space-y-5">
        {/* Balance breakdown */}
        <div className="rounded-[8px] border border-[#3d3d3d] p-4 space-y-3">
          {/* Total project cost — always shown */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-[rgba(255,255,255,0.5)]">Total project cost</span>
            <span className="text-sm text-[#f5f5f5]">{total.toFixed(0)} DUSD</span>
          </div>

          {/* Current balance — only show breakdown rows when partial top-up */}
          {isPartialTopUp && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[rgba(255,255,255,0.5)]">Your current balance</span>
              <span className="text-sm text-[#f5f5f5]">
                {isLoadingBalance ? (
                  <Spinner size="sm" />
                ) : (
                  `${currentBalance.toFixed(0)} DUSD`
                )}
              </span>
            </div>
          )}

          {/* Divider when partial top-up */}
          {isPartialTopUp && (
            <div className="border-t border-[#3d3d3d]" />
          )}

          {/* Deposit amount — the actionable number, always prominent */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-[rgba(255,255,255,0.7)]">
              {isPartialTopUp ? 'Amount to deposit' : 'Amount needed'}
            </span>
            <span className="text-base font-bold text-[#36d399]">
              {depositAmount.toFixed(0)} DUSD
            </span>
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 rounded-[8px] bg-[#141414] p-4">
          <i className="ri-information-line mt-0.5 shrink-0 text-base text-[#36d399]" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.6)]">
            {isPartialTopUp
              ? 'You already have some DUSD in your wallet. Only the difference will be deposited via bank transfer.'
              : 'Your fiat payment will be deposited as DUSD in your wallet on the Kreivo blockchain.'
            }
            {' '}Once deposited, you can return to scope review to approve and fund the project escrow.
          </p>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          className="w-full gap-2"
          onClick={onStart}
          isLoading={isRequesting || isLoadingUser}
          disabled={isRequesting || isLoadingUser}
        >
          <i className="ri-bank-line" aria-hidden="true" />
          Start Bank Transfer
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// BankTransferStep
// ---------------------------------------------------------------------------

interface BankTransferStepProps {
  instructions: {
    amount: string;
    bankAccount: string;
    reference: string;
  };
  onConfirm: () => void;
  isConfirming: boolean;
}

function BankTransferStep({ instructions, onConfirm, isConfirming }: BankTransferStepProps): React.JSX.Element {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  function copyToClipboard(value: string, field: string): void {
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  return (
    <Card className="rounded-[12px] border-[#3d3d3d] bg-[#231f1f]">
      <CardContent className="p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-[#f5f5f5]">
            Bank Transfer Details
          </h3>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.5)]">
            Send the exact amount to the following bank account
          </p>
        </div>

        {/* Bank details */}
        <div className="space-y-3">
          <CopyableField
            label="Bank Account (IBAN)"
            value={instructions.bankAccount}
            onCopy={() => copyToClipboard(instructions.bankAccount, 'iban')}
            isCopied={copiedField === 'iban'}
          />
          <CopyableField
            label="Reference"
            value={instructions.reference}
            onCopy={() => copyToClipboard(instructions.reference, 'ref')}
            isCopied={copiedField === 'ref'}
          />
          <CopyableField
            label="Amount"
            value={instructions.amount}
            onCopy={() => copyToClipboard(instructions.amount, 'amount')}
            isCopied={copiedField === 'amount'}
          />
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 rounded-[8px] border border-yellow-500/20 bg-yellow-500/10 p-3">
          <i className="ri-error-warning-line mt-0.5 shrink-0 text-yellow-400" aria-hidden="true" />
          <p className="text-xs text-yellow-300">
            Use the exact reference and amount. Incorrect details may delay processing.
          </p>
        </div>

        {/* Confirm */}
        <Button
          variant="primary"
          size="lg"
          className="w-full gap-2"
          onClick={onConfirm}
          isLoading={isConfirming}
          disabled={isConfirming}
        >
          <i className="ri-check-line" aria-hidden="true" />
          I&apos;ve Completed the Transfer
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CopyableField
// ---------------------------------------------------------------------------

interface CopyableFieldProps {
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
}

function CopyableField({ label, value, onCopy, isCopied }: CopyableFieldProps): React.JSX.Element {
  return (
    <div className="rounded-[8px] border border-[#3d3d3d] bg-[#141414] p-3">
      <p className="mb-1 text-xs text-[rgba(255,255,255,0.4)]">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-mono text-[#f5f5f5] break-all">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md p-1 text-[rgba(255,255,255,0.4)] transition-colors hover:text-[rgba(255,255,255,0.8)]"
          title={isCopied ? 'Copied!' : 'Copy'}
        >
          <i className={isCopied ? 'ri-check-line text-[#36d399]' : 'ri-clipboard-line'} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmingStep
// ---------------------------------------------------------------------------

function ConfirmingStep(): React.JSX.Element {
  return (
    <Card className="rounded-[12px] border-[#3d3d3d] bg-[#231f1f]">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-3 py-6">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-[#f5f5f5]">
            Confirming deposit...
          </p>
          <p className="text-xs text-[rgba(255,255,255,0.5)]">
            Your DUSD will appear in your wallet shortly
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CompletedStep
// ---------------------------------------------------------------------------

interface CompletedStepProps {
  projectId: string;
  onBackToReview: () => void;
}

function CompletedStep({ projectId, onBackToReview }: CompletedStepProps): React.JSX.Element {
  return (
    <Card className="rounded-[12px] border-[#36d399]/30 bg-[#36d399]/5">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#36d399]/20">
          <i className="ri-checkbox-circle-line text-3xl text-[#36d399]" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[#f5f5f5]">
          DUSD Deposited Successfully
        </h3>
        <p className="text-sm text-[rgba(255,255,255,0.6)]">
          Your wallet has been loaded with DUSD. You can now go back to
          review and approve the project scope.
        </p>
        <Button
          variant="primary"
          className="w-full"
          onClick={onBackToReview}
        >
          Back to Scope Review
        </Button>
        <Link
          to={`/projects/${projectId}`}
          className="block text-xs text-[rgba(255,255,255,0.5)] transition-colors hover:text-[#f5f5f5]"
        >
          Go to Project
        </Link>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ErrorStep
// ---------------------------------------------------------------------------

interface ErrorStepProps {
  message: string;
  onRetry: () => void;
}

function ErrorStep({ message, onRetry }: ErrorStepProps): React.JSX.Element {
  return (
    <Card className="rounded-[12px] border-red-500/30 bg-red-500/5">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
          <i className="ri-error-warning-line text-3xl text-red-400" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[#f5f5f5]">
          Something went wrong
        </h3>
        <p className="text-sm text-red-400">{message}</p>
        <Button
          variant="primary"
          className="w-full"
          onClick={onRetry}
        >
          Try Again
        </Button>
      </CardContent>
    </Card>
  );
}
