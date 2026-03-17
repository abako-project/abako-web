import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '@hooks/useAuth';
import {
  useWalletRegister,
  useDetectWallets,
  classifyWalletError,
} from '@hooks/useWalletAuth';
import { performWebAuthnRegister } from '@lib/virto-sdk';
import { SUPPORTED_WALLETS, getWalletAccounts } from '@lib/wallet-connect';
import type { WalletExtension, WalletAccount } from '@lib/wallet-connect';
import { Spinner } from '@components/ui/Spinner';

// ---------------------------------------------------------------------------
// Wallet icon helpers (inline SVGs — same as WalletLoginPage)
// ---------------------------------------------------------------------------

function TalismanIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#D5FF5C" />
      <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z" fill="#1A1A1A" />
      <path d="M16 9a7 7 0 100 14A7 7 0 0016 9zm0 2a5 5 0 110 10A5 5 0 0116 11z" fill="#D5FF5C" />
    </svg>
  );
}

function PolkadotJsIcon({ size = 24 }: { size?: number }) {
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

function SubWalletIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#4CEAAC" />
      <path d="M10 12h12M10 16h8M10 20h10" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon({ name, size = 24 }: { name: string; size?: number }) {
  if (name === 'talisman') return <TalismanIcon size={size} />;
  if (name === 'polkadot-js') return <PolkadotJsIcon size={size} />;
  if (name === 'subwallet-js') return <SubWalletIcon size={size} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 6, backgroundColor: 'var(--base-border, #3d3d3d)' }} />
  );
}

// ---------------------------------------------------------------------------
// Wallet flow sub-steps
// ---------------------------------------------------------------------------

type WalletStep = 'select-wallet' | 'enter-name' | 'select-account' | 'signing';

/**
 * Client Registration Page
 *
 * Figma design: Clean form with email and name inputs and submit button.
 * Collects email + name, performs WebAuthn registration via Virto SDK,
 * then sends preparedData to the backend API for account creation.
 *
 * Additionally offers a "Sign up with Wallet" path that creates the profile
 * directly using the SS58 address as the identifier (no WebAuthn required).
 */
export default function ClientRegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const walletRegisterMutation = useWalletRegister();

  // ----- WebAuthn form state -----
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  // ----- Wallet flow state -----
  const [showWalletFlow, setShowWalletFlow] = useState(false);
  const [walletStep, setWalletStep] = useState<WalletStep>('select-wallet');
  const [walletName, setWalletName] = useState('');
  const [walletError, setWalletError] = useState('');
  const [walletStatus, setWalletStatus] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletExtension | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const {
    data: wallets,
    isLoading: isDetecting,
  } = useDetectWallets({ enabled: showWalletFlow });

  // ----- WebAuthn handlers -----

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setIsRegistering(true);

    try {
      const preparedData = await performWebAuthnRegister(email, name, (progressStatus) => {
        setStatus(progressStatus);
      });

      setStatus('Creating your account...');
      await registerMutation.mutateAsync({
        email,
        name,
        role: 'client',
        preparedData,
      });

      setStatus('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login/client');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setStatus('Registration failed');
      console.error('Client registration error:', errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  // ----- Wallet flow handlers -----

  const handleOpenWalletFlow = () => {
    setShowWalletFlow(true);
    setWalletStep('select-wallet');
    setWalletError('');
    setWalletStatus('');
    setSelectedWallet(null);
    setSelectedAccount(null);
    setAccounts([]);
    setWalletName('');
  };

  const handleConnectWallet = useCallback(async (wallet: WalletExtension) => {
    setWalletError('');
    setSelectedWallet(wallet);
    setSelectedAccount(null);
    setAccounts([]);
    setIsLoadingAccounts(true);
    // Move to name entry first so the user can provide their display name
    // before we list accounts (better UX than collecting it at the end).
    setWalletStep('enter-name');

    try {
      const walletAccounts = await getWalletAccounts(wallet.name);
      setAccounts(walletAccounts);
    } catch (err) {
      console.warn('[ClientRegisterPage] Failed to fetch accounts:', err);
      setAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  const handleNameContinue = () => {
    if (!walletName.trim()) {
      setWalletError('Please enter your name to continue.');
      return;
    }
    setWalletError('');
    setWalletStep('select-account');
  };

  const handleWalletRegister = async () => {
    if (!selectedAccount) return;
    if (!walletName.trim()) {
      setWalletError('Please enter your name.');
      return;
    }

    setWalletError('');
    setWalletStatus('');
    setWalletStep('signing');

    try {
      setWalletStatus('Creating your profile...');
      await walletRegisterMutation.mutateAsync({
        address: selectedAccount.address,
        name: walletName.trim(),
        role: 'client',
      });
      navigate('/dashboard');
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      const kind = classifyWalletError(errorObj);
      let msg: string;
      if (kind === 'user_rejected') {
        msg = 'Signing was cancelled. Please try again and approve the request in your wallet.';
      } else if (kind === 'server_unsupported') {
        msg = 'This wallet address is not supported. Please try a different account.';
      } else {
        msg = errorObj.message;
      }
      setWalletError(msg);
      setWalletStep('select-account');
    }
  };

  // ----- Wallet flow render -----

  const renderWalletFlow = () => {
    if (walletStep === 'select-wallet') {
      const walletList = wallets ?? SUPPORTED_WALLETS.map((w) => ({ ...w, installed: false }));

      return (
        <div>
          <button
            type="button"
            onClick={() => setShowWalletFlow(false)}
            className="flex items-center gap-2 mb-5 hover:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))', fontSize: '14px', padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to email registration
          </button>

          <p className="mb-4" style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
            Choose a wallet to sign up with:
          </p>

          {isDetecting ? (
            <div className="flex items-center justify-center py-6">
              <Spinner size="sm" />
              <span className="ml-3" style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
                Detecting wallets...
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {walletList.map((wallet) => (
                <div
                  key={wallet.name}
                  className="flex items-center gap-3 p-4"
                  style={{ backgroundColor: 'var(--base-surface-2, #231f1f)', border: '1px solid var(--base-border, #3d3d3d)', borderRadius: '12px' }}
                >
                  <WalletIcon name={wallet.name} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ fontSize: '15px', color: 'var(--text-dark-primary, #f5f5f5)' }}>
                      {wallet.displayName}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.5))' }}>
                      {wallet.installed ? 'Installed' : 'Not installed'}
                    </p>
                  </div>
                  {wallet.installed ? (
                    <button
                      type="button"
                      onClick={() => handleConnectWallet(wallet)}
                      className="font-semibold transition-opacity hover:opacity-90"
                      style={{ height: '34px', padding: '0 14px', fontSize: '13px', backgroundColor: 'var(--state-brand-active, #36d399)', color: 'var(--text-light-primary, #141414)', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    >
                      Connect
                    </button>
                  ) : (
                    <a
                      href={wallet.installUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold transition-opacity hover:opacity-90"
                      style={{ height: '34px', padding: '0 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', border: '1px solid var(--base-border, #3d3d3d)', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))', borderRadius: '8px', textDecoration: 'none', flexShrink: 0 }}
                    >
                      Install
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (walletStep === 'enter-name') {
      return (
        <div>
          <button
            type="button"
            onClick={() => setWalletStep('select-wallet')}
            className="flex items-center gap-2 mb-5 hover:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))', fontSize: '14px', padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to wallets
          </button>

          {selectedWallet && (
            <div className="flex items-center gap-3 mb-5">
              <WalletIcon name={selectedWallet.name} size={28} />
              <p className="font-semibold" style={{ fontSize: '15px', color: 'var(--text-dark-primary, #f5f5f5)' }}>
                {selectedWallet.displayName}
              </p>
            </div>
          )}

          <p className="mb-4" style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
            Enter your name for the profile:
          </p>

          <input
            type="text"
            placeholder="Your Name"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            className="w-full font-medium mb-4"
            style={{ height: '44px', padding: '0 16px', fontSize: '16px', backgroundColor: 'var(--base-surface-1, #141414)', border: '1px solid var(--base-border, #3d3d3d)', borderRadius: '12px', color: 'var(--text-dark-primary, #f5f5f5)', outline: 'none' }}
          />

          {walletError && (
            <div className="mb-4 p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
              <p style={{ fontSize: '14px', color: '#ef4444' }}>{walletError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleNameContinue}
            disabled={isLoadingAccounts}
            className="w-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ height: '44px', fontSize: '16px', backgroundColor: 'var(--state-brand-active, #36d399)', color: 'var(--text-light-primary, #141414)', borderRadius: '12px', border: 'none', cursor: isLoadingAccounts ? 'not-allowed' : 'pointer' }}
          >
            {isLoadingAccounts ? 'Loading accounts...' : 'Continue'}
          </button>
        </div>
      );
    }

    if (walletStep === 'select-account' || walletStep === 'signing') {
      const isSigning = walletStep === 'signing' || walletRegisterMutation.isPending;
      const shortAddress = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

      return (
        <div>
          <button
            type="button"
            onClick={() => setWalletStep('enter-name')}
            disabled={isSigning}
            className="flex items-center gap-2 mb-5 hover:opacity-70 transition-opacity disabled:opacity-40"
            style={{ background: 'none', border: 'none', cursor: isSigning ? 'not-allowed' : 'pointer', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))', fontSize: '14px', padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          {selectedWallet && (
            <div className="flex items-center gap-3 mb-4">
              <WalletIcon name={selectedWallet.name} size={28} />
              <p className="font-semibold" style={{ fontSize: '15px', color: 'var(--text-dark-primary, #f5f5f5)' }}>
                {selectedWallet.displayName}
              </p>
            </div>
          )}

          <p className="mb-3" style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
            Select an account to register with:
          </p>

          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-5">
              <Spinner size="sm" />
              <span className="ml-3" style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
                Loading accounts...
              </span>
            </div>
          ) : accounts.length === 0 ? (
            <p className="py-4 text-center" style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
              No accounts found in this wallet. Please create or import an account first.
            </p>
          ) : (
            <div className="space-y-2 mb-4">
              {accounts.map((account) => {
                const isSelected = selectedAccount?.address === account.address;
                return (
                  <button
                    key={account.address}
                    type="button"
                    onClick={() => setSelectedAccount(account)}
                    disabled={isSigning}
                    className="w-full text-left flex items-center gap-3 p-3 transition-all"
                    style={{ backgroundColor: isSelected ? 'rgba(54, 211, 153, 0.1)' : 'var(--base-surface-2, #231f1f)', border: `1px solid ${isSelected ? 'var(--state-brand-active, #36d399)' : 'var(--base-border, #3d3d3d)'}`, borderRadius: '10px', cursor: isSigning ? 'not-allowed' : 'pointer' }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--state-brand-active, #36d399)' : 'var(--base-border, #3d3d3d)'}`, backgroundColor: isSelected ? 'var(--state-brand-active, #36d399)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && (
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="#141414" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {account.name && (
                        <p className="font-medium truncate" style={{ fontSize: '14px', color: 'var(--text-dark-primary, #f5f5f5)' }}>
                          {account.name}
                        </p>
                      )}
                      <p className="font-mono truncate" style={{ fontSize: '12px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.5))' }}>
                        {shortAddress(account.address)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {walletError && (
            <div className="mb-4 p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px' }}>
              <p style={{ fontSize: '14px', color: '#ef4444' }}>{walletError}</p>
            </div>
          )}

          {walletStatus && !walletError && (
            <p className="mb-3 text-center" style={{ fontSize: '13px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
              {walletStatus}
            </p>
          )}

          {accounts.length > 0 && (
            <button
              type="button"
              onClick={handleWalletRegister}
              disabled={!selectedAccount || isSigning}
              className="w-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ height: '44px', fontSize: '16px', backgroundColor: 'var(--state-brand-active, #36d399)', color: 'var(--text-light-primary, #141414)', borderRadius: '12px', border: 'none', cursor: !selectedAccount || isSigning ? 'not-allowed' : 'pointer' }}
            >
              {isSigning ? 'Waiting for wallet signature...' : 'Sign up with this Account'}
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1
          className="font-bold mb-2"
          style={{
            fontSize: '24px',
            color: 'var(--text-dark-primary, #f5f5f5)',
          }}
        >
          Create Client Account
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
          }}
        >
          {showWalletFlow ? 'Register using your Polkadot wallet' : 'Enter your email below to create your account'}
        </p>
      </div>

      {showWalletFlow ? (
        renderWalletFlow()
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block mb-2"
                style={{
                  fontSize: '16px',
                  color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="your-email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isRegistering}
                className="w-full font-medium"
                style={{
                  height: '44px',
                  padding: '0 16px',
                  fontSize: '16px',
                  backgroundColor: 'var(--base-surface-1, #141414)',
                  border: '1px solid var(--base-border, #3d3d3d)',
                  borderRadius: '12px',
                  color: 'var(--text-dark-primary, #f5f5f5)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Name Input */}
            <div>
              <label
                htmlFor="name"
                className="block mb-2"
                style={{
                  fontSize: '16px',
                  color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
                }}
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isRegistering}
                className="w-full font-medium"
                style={{
                  height: '44px',
                  padding: '0 16px',
                  fontSize: '16px',
                  backgroundColor: 'var(--base-surface-1, #141414)',
                  border: '1px solid var(--base-border, #3d3d3d)',
                  borderRadius: '12px',
                  color: 'var(--text-dark-primary, #f5f5f5)',
                  outline: 'none',
                }}
              />
            </div>

            {error && (
              <div
                className="p-3"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                }}
              >
                <p style={{ fontSize: '14px', color: '#ef4444' }}>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                height: '44px',
                fontSize: '16px',
                backgroundColor: 'var(--state-brand-active, #36d399)',
                color: 'var(--text-light-primary, #141414)',
                borderRadius: '12px',
                border: 'none',
                cursor: isRegistering ? 'not-allowed' : 'pointer',
              }}
            >
              {isRegistering ? 'Registering...' : 'Register with Passkey'}
            </button>

            {status && !error && (
              <p
                className="text-center"
                style={{
                  fontSize: '14px',
                  color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
                }}
              >
                {status}
              </p>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--base-border, #3d3d3d)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.5))' }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--base-border, #3d3d3d)' }} />
          </div>

          {/* Wallet sign-up button */}
          <button
            type="button"
            onClick={handleOpenWalletFlow}
            disabled={isRegistering}
            className="w-full font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              height: '44px',
              fontSize: '16px',
              backgroundColor: 'transparent',
              color: 'var(--text-dark-primary, #f5f5f5)',
              borderRadius: '12px',
              border: '1px solid var(--base-border, #3d3d3d)',
              cursor: isRegistering ? 'not-allowed' : 'pointer',
            }}
          >
            {/* Polkadot dot icon */}
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="6" fill="#E6007A" />
              <circle cx="16" cy="5" r="3" fill="#E6007A" />
              <circle cx="16" cy="27" r="3" fill="#E6007A" />
              <circle cx="5" cy="16" r="3" fill="#E6007A" />
              <circle cx="27" cy="16" r="3" fill="#E6007A" />
            </svg>
            Sign up with Wallet
          </button>
        </>
      )}

      <div className="mt-8 space-y-4">
        <div className="text-center">
          <Link
            to="/register"
            className="hover:underline"
            style={{
              fontSize: '14px',
              color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))',
            }}
          >
            Back to role selection
          </Link>
        </div>

        <div className="text-center">
          <span style={{ fontSize: '14px', color: 'var(--text-dark-secondary, rgba(255,255,255,0.7))' }}>
            Already have an account?{' '}
          </span>
          <Link
            to="/login/client"
            className="font-medium hover:underline"
            style={{
              fontSize: '14px',
              color: 'var(--state-brand-active, #36d399)',
            }}
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
