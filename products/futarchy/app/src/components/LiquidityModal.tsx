import { useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowRight, IconPlus, IconX } from './icons';
import '../styles/overlays.css';

export function LiquidityModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [amounts, setAmounts] = useState({ USDS: '', WETH: '' });
  const [allocations, setAllocations] = useState({ PASS: 50, FAIL: 50 });
  const [confirmingClose, setConfirmingClose] = useState(false);

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();

    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const update = (token: 'USDS' | 'WETH', value: string) => {
    setConfirmingClose(false);
    setAmounts(current => ({
      ...current,
      [token]:
        value === ''
          ? ''
          : String(Math.min(1000000, Math.max(0, Number(value) || 0))),
    }));
  };

  const updateAllocation = (side: 'PASS' | 'FAIL', value: string) => {
    const next = Math.min(100, Math.max(0, Number(value) || 0));
    const other = side === 'PASS' ? 'FAIL' : 'PASS';

    setConfirmingClose(false);
    setAllocations({
      [side]: next,
      [other]: 100 - next,
    } as { PASS: number; FAIL: number });
  };

  const expectedPoolShare = useMemo(() => {
    const total = Number(amounts.USDS || 0) + Number(amounts.WETH || 0);
    return `${Math.min(100, (total / 1000) * 100).toFixed(2)}%`;
  }, [amounts]);

  const hasUnsavedChanges =
    amounts.USDS !== '' ||
    amounts.WETH !== '' ||
    allocations.PASS !== 50 ||
    allocations.FAIL !== 50;

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setConfirmingClose(true);
      return;
    }

    onClose();
  };

  const addLiquidity = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('seer:connect'));
  };

  return (
    <dialog
      ref={dialog}
      className="ov-dialog ov-dialog--liquidity"
      aria-labelledby="liquidity-title"
      aria-describedby="liquidity-description"
      onCancel={event => {
        event.preventDefault();
        requestClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="ov-dialog__surface">
        <form
          noValidate
          onSubmit={event => {
            event.preventDefault();
            addLiquidity();
          }}
        >
          <div className="ov-modal__header">
            <h2 className="ov-modal__title" id="liquidity-title">
              Add liquidity
            </h2>
            <button
              type="button"
              autoFocus
              className="ov-icon-button"
              aria-label="Close"
              onClick={requestClose}
            >
              <IconX width={20} height={20} />
            </button>
          </div>

          <p className="ov-modal__description" id="liquidity-description">
            Add token amounts and choose how the pool is allocated between the
            PASS and FAIL markets.
          </p>

          <div className="ov-liquidity__fields">
            {(['USDS', 'WETH'] as const).map(token => (
              <div className="ov-amount" key={token}>
                <div className="ov-amount__header">
                  <div>
                    <label htmlFor={`liquidity-${token}`}>
                      Amount ({token})
                    </label>
                    <div
                      className="ov-meta-line"
                      id={`liquidity-${token}-balance`}
                    >
                      Wallet balance Not available
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ov-ghost-button"
                    onClick={() => update(token, '0')}
                  >
                    Max
                  </button>
                </div>

                <div className="ov-amount__control">
                  <input
                    className="ov-field__control ov-amount__input"
                    id={`liquidity-${token}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="1000000"
                    step="any"
                    value={amounts[token]}
                    aria-describedby={`liquidity-${token}-balance`}
                    onChange={event => update(token, event.target.value)}
                  />
                  <span className="ov-amount__token" aria-hidden="true">
                    {token}
                  </span>
                </div>

                <div className="ov-quick-amounts">
                  {[1, 5, 20, 100].map(number => (
                    <button
                      type="button"
                      className="ov-quick-button"
                      key={number}
                      aria-label={`+${number}`}
                      onClick={() =>
                        update(
                          token,
                          String((Number(amounts[token]) || 0) + number),
                        )
                      }
                    >
                      <IconPlus width={16} height={16} />
                      <span>{number}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="ov-allocation">
            <div className="ov-field">
              <label className="ov-field__label" htmlFor="liquidity-pass">
                <span>PASS allocation</span>
              </label>
              <input
                className="ov-field__control"
                id="liquidity-pass"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                value={allocations.PASS}
                aria-describedby="liquidity-allocation-help"
                onChange={event =>
                  updateAllocation('PASS', event.target.value)
                }
              />
            </div>

            <div className="ov-field">
              <label className="ov-field__label" htmlFor="liquidity-fail">
                <span>FAIL allocation</span>
              </label>
              <input
                className="ov-field__control"
                id="liquidity-fail"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                value={allocations.FAIL}
                aria-describedby="liquidity-allocation-help"
                onChange={event =>
                  updateAllocation('FAIL', event.target.value)
                }
              />
            </div>
          </div>

          <p className="ov-field__message" id="liquidity-allocation-help">
            Allocations always total 100 percent.
          </p>

          <section className="ov-summary" aria-labelledby="liquidity-summary">
            <h3 className="ov-summary__title" id="liquidity-summary">
              Liquidity summary
            </h3>
            <dl className="ov-summary__list">
              <div>
                <dt>PASS allocation</dt>
                <dd>{allocations.PASS.toFixed(0)}%</dd>
              </div>
              <div>
                <dt>FAIL allocation</dt>
                <dd>{allocations.FAIL.toFixed(0)}%</dd>
              </div>
              <div>
                <dt>Expected pool share</dt>
                <dd>{expectedPoolShare}</dd>
              </div>
            </dl>
          </section>

          {confirmingClose ? (
            <section className="ov-confirm" role="alert">
              <strong>Discard liquidity changes?</strong>
              <p>Your entered amounts will not be saved.</p>
              <div className="ov-confirm__actions">
                <button
                  type="button"
                  className="ov-button ov-button--secondary"
                  onClick={() => setConfirmingClose(false)}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  className="ov-button ov-button--ghost"
                  onClick={onClose}
                >
                  Discard changes
                </button>
              </div>
            </section>
          ) : (
            <div className="ov-modal__footer">
              <button
                type="button"
                className="ov-button ov-button--secondary"
                onClick={requestClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ov-button ov-button--primary"
              >
                Add liquidity
                <IconArrowRight width={16} height={16} />
              </button>
            </div>
          )}
        </form>
      </div>
    </dialog>
  );
}
