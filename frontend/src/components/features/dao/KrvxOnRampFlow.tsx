/**
 * DusdOnRampFlow - Standalone on-ramp component for acquiring DUSD tokens.
 *
 * Displayed inline inside WalletCard when the user clicks "Buy DUSD".
 * Uses the Bramp service (via useBramp hooks) for fiat→crypto conversion.
 *
 * Step machine:
 *   amount       → User enters desired DUSD amount
 *   bank-details → Shows IBAN, reference, amount from Bramp
 *   confirming   → Spinner while deposit is confirmed + tokens minted
 *   done         → Success with updated balance
 *   error        → Error with retry option
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Spinner } from '@components/ui/Spinner';
import { useBrampUser, useRequestDeposit, useConfirmDeposit } from '@hooks/useBramp';
import { walletKeys } from '@hooks/useWalletBalance';
import { DECIMALS } from '@/api/kreivo/rpc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OnRampStep = 'amount' | 'bank-details' | 'confirming' | 'done' | 'error';

export interface DusdOnRampFlowProps {
  /** Blockchain address (ss58) where minted DUSD will be sent. */
  address: string;
  /** User email for Bramp user creation. */
  email: string;
  /** Called when the user wants to close the on-ramp and return to WalletCard. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DusdOnRampFlow({ address, email, onClose }: DusdOnRampFlowProps): React.JSX.Element {
  const queryClient = useQueryClient();

  // Step machine state
  const [step, setStep] = React.useState<OnRampStep>('amount');
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState<string>('');
  const [depositId, setDepositId] = React.useState<number | null>(null);
  const [bankInstructions, setBankInstructions] = React.useState<{
    amount: string;
    bankAccount: string;
    reference: string;
  } | null>(null);

  // Hooks
  const brampUser = useBrampUser(email);
  const requestDepositMutation = useRequestDeposit();
  const confirmDepositMutation = useConfirmDeposit();

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  async function handleStartDeposit(): Promise<void> {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setStepError('Please enter a valid amount greater than 0');
      setStep('error');
      return;
    }

    if (!brampUser.data) {
      setStepError('Could not resolve your Bramp account. Please try again.');
      setStep('error');
      return;
    }

    try {
      // Convert human-readable amount to raw planck units.
      // Backend mints raw units; e.g. with 3 decimals: 100 DUSD = 100000 raw.
      const rawAmount = Math.floor(parsedAmount * 10 ** DECIMALS.DUSD);

      const result = await requestDepositMutation.mutateAsync({
        userId: brampUser.data.id,
        amount: rawAmount.toString(),
        toAddress: address,
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
    if (depositId === null) {
      setStepError('No deposit ID found. Please start over.');
      setStep('error');
      return;
    }

    setStep('confirming');

    try {
      await confirmDepositMutation.mutateAsync({
        depositId,
        toAddress: address,
      });

      // Invalidate the wallet balance queries so the card refreshes
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });

      setStep('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm deposit';
      const isTimeout = message.includes('504') || message.includes('timeout') || message.includes('Timeout');

      if (isTimeout) {
        // The blockchain transaction may have succeeded even though the HTTP request timed out.
        // Invalidate balance queries so the wallet refreshes and shows the minted tokens.
        void queryClient.invalidateQueries({ queryKey: walletKeys.all });
        setStepError(
          'The request timed out, but the transaction may have been processed. ' +
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
    setStep('amount');
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
          Buy DUSD
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded-md text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.8)] transition-colors"
          aria-label="Close"
        >
          <i className="ri-close-line text-lg" aria-hidden="true" />
        </button>
      </div>

      {step === 'amount' && (
        <AmountStep
          amount={amount}
          onAmountChange={setAmount}
          onStart={() => void handleStartDeposit()}
          isRequesting={requestDepositMutation.isPending}
          isLoadingUser={brampUser.isLoading}
        />
      )}

      {step === 'bank-details' && bankInstructions && (
        <BankDetailsStep
          instructions={bankInstructions}
          onConfirm={() => void handleConfirmTransfer()}
        />
      )}

      {step === 'confirming' && <ConfirmingStep />}

      {step === 'done' && <DoneStep onClose={onClose} />}

      {step === 'error' && (
        <ErrorStep
          message={stepError ?? 'An unexpected error occurred'}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AmountStep
// ---------------------------------------------------------------------------

interface AmountStepProps {
  amount: string;
  onAmountChange: (value: string) => void;
  onStart: () => void;
  isRequesting: boolean;
  isLoadingUser: boolean;
}

function AmountStep({ amount, onAmountChange, onStart, isRequesting, isLoadingUser }: AmountStepProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="dusd-amount"
          className="block mb-1.5 text-xs text-[rgba(255,255,255,0.5)]"
        >
          Amount (DUSD)
        </label>
        <Input
          id="dusd-amount"
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 1000"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="bg-[#141414] border-[#3d3d3d] text-[#f5f5f5]"
        />
      </div>

      <div className="flex items-start gap-2 rounded-[8px] bg-[#141414] p-3">
        <i className="ri-information-line mt-0.5 shrink-0 text-base text-[var(--state-brand-active,#36d399)]" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-[rgba(255,255,255,0.6)]">
          Your fiat payment will be converted 1:1 to DUSD tokens on the Kreivo blockchain.
        </p>
      </div>

      <Button
        variant="primary"
        size="sm"
        className="w-full gap-2"
        onClick={onStart}
        isLoading={isRequesting || isLoadingUser}
        disabled={isRequesting || isLoadingUser || !amount || parseFloat(amount) <= 0}
      >
        <i className="ri-bank-line" aria-hidden="true" />
        Start Deposit
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BankDetailsStep
// ---------------------------------------------------------------------------

interface BankDetailsStepProps {
  instructions: {
    amount: string;
    bankAccount: string;
    reference: string;
  };
  onConfirm: () => void;
}

function BankDetailsStep({ instructions, onConfirm }: BankDetailsStepProps): React.JSX.Element {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  function copyToClipboard(value: string, field: string): void {
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[rgba(255,255,255,0.5)]">
        Send the exact amount to the following bank account
      </p>

      <div className="space-y-2">
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

      <Button
        variant="primary"
        size="sm"
        className="w-full gap-2"
        onClick={onConfirm}
      >
        <i className="ri-check-line" aria-hidden="true" />
        I&apos;ve Completed the Transfer
      </Button>
    </div>
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
    <div className="flex flex-col items-center gap-3 py-6">
      <Spinner size="lg" />
      <p className="text-sm font-medium text-[var(--text-dark-primary,#f5f5f5)]">
        Minting DUSD tokens...
      </p>
      <p className="text-xs text-[rgba(255,255,255,0.5)]">
        This may take a few moments
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DoneStep
// ---------------------------------------------------------------------------

function DoneStep({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#36d399]/20">
        <i className="ri-checkbox-circle-line text-2xl text-[#36d399]" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
        DUSD Tokens Received
      </p>
      <p className="text-xs text-center text-[rgba(255,255,255,0.5)]">
        Your balance has been updated. You can now use DUSD to fund project escrows.
      </p>
      <Button variant="outline" size="sm" className="w-full mt-1" onClick={onClose}>
        Close
      </Button>
    </div>
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
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
        <i className="ri-error-warning-line text-2xl text-red-400" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-dark-primary,#f5f5f5)]">
        Something went wrong
      </p>
      <p className="text-xs text-center text-red-400">{message}</p>
      <Button variant="outline" size="sm" className="w-full mt-1" onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}
