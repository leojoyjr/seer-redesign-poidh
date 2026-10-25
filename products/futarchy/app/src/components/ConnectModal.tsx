import { useEffect, useRef, useState } from 'react';
import { IconWallet, IconX } from './icons';
import '../styles/overlays.css';

type Wallet = {
  request(options: { method: string }): Promise<unknown>;
};

export function ConnectModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState('Choose a wallet to continue.');
  const [busy, setBusy] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();

    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const connect = async () => {
    const wallet = (window as Window & { ethereum?: Wallet }).ethereum;

    if (!wallet) {
      setHasError(true);
      setMessage(
        'No browser wallet found. Install or enable an Ethereum wallet, then try again.',
      );
      return;
    }

    setBusy(true);
    setHasError(false);
    setMessage('Connecting');

    try {
      const accounts = await wallet.request({ method: 'eth_requestAccounts' });
      if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
        throw new Error('No account selected.');
      }

      setMessage('Connected');
      (
        window as Window & {
          seerShell?: { setConnected(address: string | null): void };
        }
      ).seerShell?.setConnected(
        `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      );
      onClose();
    } catch {
      setHasError(true);
      setMessage(
        'The wallet did not connect. Open the wallet, approve the request, then try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="ov-dialog ov-dialog--connect"
      aria-labelledby="connect-title"
      aria-describedby="connect-message"
      onCancel={onClose}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ov-dialog__surface">
        <div className="ov-modal__header">
          <h2 className="ov-modal__title" id="connect-title">
            Connect wallet
          </h2>
          <button
            type="button"
            className="ov-icon-button"
            aria-label="Close"
            onClick={onClose}
          >
            <IconX width={20} height={20} />
          </button>
        </div>

        <p className="ov-modal__description">
          Choose a wallet to continue.
        </p>

        <div className="ov-connect__wallets">
          <p className="ov-connect__label">Recently used</p>
          <button
            type="button"
            className="ov-wallet-option"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void connect()}
          >
            {busy ? (
              <span className="ov-spinner ov-wallet-option__icon" />
            ) : (
              <IconWallet width={32} height={32} />
            )}
            <span className="ov-wallet-option__text">
              <strong>Browser wallet</strong>
              <span>
                {busy
                  ? 'Connecting'
                  : hasError
                    ? 'Try again'
                    : 'Use browser wallet'}
              </span>
            </span>
          </button>
        </div>

        <p
          className={`ov-connect__status${
            hasError ? ' ov-connect__status--error' : ''
          }`}
          id="connect-message"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {hasError ? (
            <IconX width={16} height={16} />
          ) : (
            <span className="ov-connect__status-dot" aria-hidden="true" />
          )}
          <span>{message}</span>
        </p>

        <div className="ov-modal__footer">
          <button
            type="button"
            className="ov-button ov-button--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
