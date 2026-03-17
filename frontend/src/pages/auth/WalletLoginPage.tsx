import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Spinner } from '@components/ui/Spinner';
import {
  useDetectWallets,
  useWalletLogin,
  classifyWalletError,
  type WalletLoginErrorKind,
} from '@hooks/useWalletAuth';
import type { WalletExtension, WalletAccount } from '@lib/wallet-connect';
import { SUPPORTED_WALLETS, getWalletAccounts } from '@lib/wallet-connect';

// ---------------------------------------------------------------------------
// Wallet icons (inline SVGs for zero external dependencies)
// ---------------------------------------------------------------------------

function TalismanIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#D5FF5C" />
      <path
        d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z"
        fill="#1A1A1A"
      />
      <path
        d="M16 9a7 7 0 100 14A7 7 0 0016 9zm0 2a5 5 0 110 10A5 5 0 0116 11z"
        fill="#D5FF5C"
      />
    </svg>
  );
}

function PolkadotJsIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#E6007A" />
      <circle cx="16" cy="16" r="6" fill="white" />
      <circle cx="16" cy="7" r="2.5" fill="white" />
      <circle cx="16" cy="25" r="2.5" fill="white" />
      <circle cx="7" cy="16" r="2.5" fill="white" />
      <circle cx="25" cy="16" r="2.5" fill="white" />
    </svg>
  );
}

function SubWalletIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#4CEAAC" />
      <path
        d="M10 12h12M10 16h8M10 20h10"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WalletIcon({ name, size = 32 }: { name: string; size?: number }) {
  if (name === 'talisman') return <TalismanIcon size={size} />;
  if (name === 'polkadot-js') return <PolkadotJsIcon size={size} />;
  if (name === 'subwallet-js') return <SubWalletIcon size={size} />;
  return (
    <div
      style={{ width: size, height: size, borderRadius: 8, backgroundColor: 'var(--base-border, #3d3d3d)' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Step type: tracks the multi-step flow
// ---------------------------------------------------------------------------

type Step =
  | 'detect'       // detecting wallets
  | 'select-wallet' // user chooses a wallet
  | 'select-account' // user chooses an account from the wallet
  | 'signing'      // waiting for user to sign in wallet
  | 'done';        // success

// ---------------------------------------------------------------------------
// Error message renderer
// ---------------------------------------------------------------------------

function errorMessage(kind: WalletLoginErrorKind, rawMessage: string): string {
  switch (kind) {
    case 'server_unsupported':
      return 'Wallet login is not yet supported by the server. Please use passkey login.';
    case 'user_rejected':
      return 'Signing was cancelled. Please try again and approve the request in your wallet.';
    case 'no_accounts':
      return 'No accounts found in this wallet. Please create or import an account first.';
    default:
      return rawMessage;
  }
}

// ---------------------------------------------------------------------------
// Wallet card component
// ---------------------------------------------------------------------------

interface WalletCardProps {
  wallet: WalletExtension;
  onConnect: (wallet: WalletExtension) => void;
  isLoading: boolean;
}

function WalletCard({ wallet, onConnect, isLoading }: WalletCardProps) {
  const isInstalled = wallet.installed;

  return (
    <div
      className="flex items-center gap-4 p-4 transition-all"
      style={{
        backgroundColor: 'var(--base-surface-2, #231f1f)',
        border: '1px solid var(--base-border, #3d3d3d)',
        borderRadius: '12px',
      }}
    >
      <WalletIcon name={wallet.name} size={40} />

      <div className="flex-1 min-w-0">
        <p
          className="font-semibold"
          style={{ fontSize: '16px', color: 'var(--text-dark-primary, #f5f5f5)' }}
        >
          {wallet.displayName}
        </p>
        <p
          style={{ fontSize: '12px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.5))' }}
        >
          {isInstalled ? 'Installed' : 'Not installed'}
        </p>
      </div>

      {isInstalled ? (
        <button
          type="button"
          onClick={() => onConnect(wallet)}
          disabled={isLoading}
          className="font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            height: '36px',
            padding: '0 16px',
            fontSize: '14px',
            backgroundColor: 'var(--state-brand-active, #36d399)',
            color: 'var(--text-light-primary, #141414)',
            borderRadius: '8px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          Connect
        </button>
      ) : (
        <a
          href={wallet.installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold transition-opacity hover:opacity-90"
          style={{
            height: '36px',
            padding: '0 16px',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            border: '1px solid var(--base-border, #3d3d3d)',
            color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
            borderRadius: '8px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          Install
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account selector component
// ---------------------------------------------------------------------------

interface AccountSelectorProps {
  accounts: WalletAccount[];
  selectedAddress: string | null;
  onSelect: (account: WalletAccount) => void;
}

function AccountSelector({ accounts, selectedAddress, onSelect }: AccountSelectorProps) {
  if (accounts.length === 0) {
    return (
      <p
        className="text-center py-4"
        style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}
      >
        No accounts found in this wallet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => {
        const isSelected = account.address === selectedAddress;
        const shortAddress = `${account.address.slice(0, 8)}...${account.address.slice(-6)}`;

        return (
          <button
            key={account.address}
            type="button"
            onClick={() => onSelect(account)}
            className="w-full text-left flex items-center gap-3 p-3 transition-all"
            style={{
              backgroundColor: isSelected
                ? 'rgba(54, 211, 153, 0.1)'
                : 'var(--base-surface-2, #231f1f)',
              border: `1px solid ${isSelected ? 'var(--state-brand-active, #36d399)' : 'var(--base-border, #3d3d3d)'}`,
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            {/* Selection indicator */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${isSelected ? 'var(--state-brand-active, #36d399)' : 'var(--base-border, #3d3d3d)'}`,
                backgroundColor: isSelected ? 'var(--state-brand-active, #36d399)' : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="#141414" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {account.name && (
                <p
                  className="font-medium truncate"
                  style={{ fontSize: '14px', color: 'var(--text-dark-primary, #f5f5f5)' }}
                >
                  {account.name}
                </p>
              )}
              <p
                className="font-mono truncate"
                style={{
                  fontSize: '12px',
                  color: 'var(--text-dark-secondary, rgba(255,255,255,0.5))',
                }}
              >
                {shortAddress}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

/**
 * WalletLoginPage
 *
 * Multi-step wallet login flow:
 *   1. Detect installed wallets
 *   2. User selects a wallet → request accounts
 *   3. User selects an account
 *   4. User clicks "Sign in" → wallet signs the extrinsic
 *   5. Redirect to dashboard on success
 */
export default function WalletLoginPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('detect');
  const [selectedWallet, setSelectedWallet] = useState<WalletExtension | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string>('');

  // Kick off wallet detection immediately on mount
  const {
    data: wallets,
    isLoading: isDetecting,
    error: detectError,
  } = useDetectWallets({ enabled: true });

  const walletLoginMutation = useWalletLogin();

  // Transition from 'detect' step once wallet list is ready
  useEffect(() => {
    if (!isDetecting && wallets) {
      setStep('select-wallet');
    }
  }, [isDetecting, wallets]);

  // Handle wallet card Connect button
  // Fetches accounts directly with the wallet name to avoid React state race condition
  const handleConnectWallet = useCallback(async (wallet: WalletExtension) => {
    setError('');
    setSelectedWallet(wallet);
    setSelectedAccount(null);
    setAccounts([]);
    setIsLoadingAccounts(true);
    setStep('select-account');

    try {
      // Call getWalletAccounts directly with the wallet name instead of
      // relying on React state (which would be stale at this point)
      const walletAccounts = await getWalletAccounts(wallet.name);
      setAccounts(walletAccounts);
    } catch (err) {
      console.warn('[WalletLoginPage] Failed to fetch accounts:', err);
      setAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  // Handle Sign In button
  const handleSignIn = async () => {
    if (!selectedAccount) return;
    if (!termsAccepted) {
      setError('Please accept the terms and conditions to continue.');
      return;
    }

    setError('');
    setStep('signing');

    try {
      const result = await walletLoginMutation.mutateAsync({
        address: selectedAccount.address,
        accountName: selectedAccount.name,
      });

      if (result.noProfile) {
        // The wallet address is authenticated but has no client/developer profile.
        // Redirect to the register role-selection page so the user can create one.
        // Pass the address as a query param — register pages may use it in future
        // to pre-fill the wallet flow.
        navigate(`/register?wallet=${encodeURIComponent(selectedAccount.address)}&reason=no_profile`);
        return;
      }

      setStep('done');
      navigate('/dashboard');
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      const kind = classifyWalletError(errorObj);
      setError(errorMessage(kind, errorObj.message));
      setStep('select-account');
    }
  };

  const handleBackToWallets = () => {
    setSelectedWallet(null);
    setSelectedAccount(null);
    setError('');
    setStep('select-wallet');
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderWalletList = () => {
    if (isDetecting) {
      return (
        <div className="flex items-center justify-center py-8">
          <Spinner size="md" />
          <span
            className="ml-3"
            style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}
          >
            Detecting wallets...
          </span>
        </div>
      );
    }

    if (detectError) {
      return (
        <p style={{ fontSize: '14px', color: '#ef4444' }}>
          Could not detect wallets. Make sure a supported wallet extension is installed.
        </p>
      );
    }

    const walletList = wallets ?? SUPPORTED_WALLETS.map((w) => ({ ...w, installed: false }));

    return (
      <div className="space-y-3">
        {walletList.map((wallet) => (
          <WalletCard
            key={wallet.name}
            wallet={wallet}
            onConnect={handleConnectWallet}
            isLoading={walletLoginMutation.isPending}
          />
        ))}
      </div>
    );
  };

  const renderAccountSelector = () => {
    if (!selectedWallet) return null;

    return (
      <div>
        {/* Back button */}
        <button
          type="button"
          onClick={handleBackToWallets}
          className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
            fontSize: '14px',
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to wallets
        </button>

        {/* Selected wallet header */}
        <div className="flex items-center gap-3 mb-5">
          <WalletIcon name={selectedWallet.name} size={32} />
          <p
            className="font-semibold"
            style={{ fontSize: '16px', color: 'var(--text-dark-primary, #f5f5f5)' }}
          >
            {selectedWallet.displayName}
          </p>
        </div>

        <p
          className="mb-4"
          style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}
        >
          Select an account to sign in with:
        </p>

        {isLoadingAccounts ? (
          <div className="flex items-center justify-center py-6">
            <Spinner size="sm" />
            <span
              className="ml-3"
              style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}
            >
              Loading accounts...
            </span>
          </div>
        ) : (
          <AccountSelector
            accounts={accounts}
            selectedAddress={selectedAccount?.address ?? null}
            onSelect={setSelectedAccount}
          />
        )}

        {/* Terms checkbox */}
        {!isLoadingAccounts && accounts.length > 0 && (
          <label
            className="flex items-start gap-3 mt-6 cursor-pointer"
            htmlFor="wallet-terms"
          >
            <input
              id="wallet-terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
              style={{ accentColor: 'var(--state-brand-active, #36d399)', width: 16, height: 16 }}
            />
            <span
              style={{
                fontSize: '13px',
                color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
                lineHeight: '1.4',
              }}
            >
              I agree to the{' '}
              <a
                href="https://abako.xyz/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: 'var(--state-brand-active, #36d399)' }}
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="https://abako.xyz/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: 'var(--state-brand-active, #36d399)' }}
              >
                Privacy Policy
              </a>
            </span>
          </label>
        )}

        {/* Sign in button */}
        {!isLoadingAccounts && accounts.length > 0 && (
          <button
            type="button"
            onClick={handleSignIn}
            disabled={!selectedAccount || !termsAccepted || walletLoginMutation.isPending}
            className="w-full mt-5 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              height: '44px',
              fontSize: '16px',
              backgroundColor: 'var(--state-brand-active, #36d399)',
              color: 'var(--text-light-primary, #141414)',
              borderRadius: '12px',
              border: 'none',
              cursor:
                !selectedAccount || !termsAccepted || walletLoginMutation.isPending
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {walletLoginMutation.isPending || step === 'signing'
              ? 'Waiting for wallet signature...'
              : 'Sign in with Wallet'}
          </button>
        )}
      </div>
    );
  };

  const renderSigning = () => (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <Spinner size="lg" />
      <p
        className="text-center"
        style={{ fontSize: '16px', color: 'var(--text-dark-primary, #f5f5f5)' }}
      >
        Waiting for wallet signature...
      </p>
      <p
        className="text-center"
        style={{ fontSize: '13px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}
      >
        Please approve the signing request in your wallet extension.
      </p>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="font-bold mb-2"
          style={{ fontSize: '24px', color: 'var(--text-dark-primary, #f5f5f5)' }}
        >
          Connect with Wallet
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
          {step === 'select-wallet' || step === 'detect'
            ? 'Choose a wallet extension to sign in'
            : step === 'select-account' || step === 'signing'
            ? 'Select an account from your wallet'
            : 'Authenticated successfully'}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-5 p-4"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
          }}
        >
          <p style={{ fontSize: '14px', color: '#ef4444', lineHeight: '1.4' }}>{error}</p>
          {error.includes('not yet supported') && (
            <p className="mt-2" style={{ fontSize: '13px', color: 'rgba(239, 68, 68, 0.8)' }}>
              <Link
                to="/login"
                className="hover:underline"
                style={{ color: 'var(--state-brand-active, #36d399)' }}
              >
                Use passkey login instead
              </Link>
            </p>
          )}
        </div>
      )}

      {/* Step content */}
      {(step === 'detect' || step === 'select-wallet') && renderWalletList()}
      {step === 'select-account' && renderAccountSelector()}
      {step === 'signing' && renderSigning()}

      {/* Footer links */}
      <div className="mt-8 space-y-3 text-center">
        <p style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
          Already have a passkey account?{' '}
          <Link
            to="/login"
            className="font-medium hover:underline"
            style={{ color: 'var(--state-brand-active, #36d399)' }}
          >
            Login with Passkey
          </Link>
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium hover:underline"
            style={{ color: 'var(--state-brand-active, #36d399)' }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
