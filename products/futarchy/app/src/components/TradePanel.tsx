import { useId, useState } from 'react';
import '../styles/detail-core.css';
import { IconArrowRight, IconMinus, IconPlus } from './icons';
import { RollingNumber } from './RollingNumber';
import { Segmented } from './Segmented';

export function TradePanel({
  yes,
  no,
  disabled = false,
  status = 'Resolved',
}: {
  yes: number;
  no: number;
  disabled?: boolean;
  status?: string;
}) {
  const [world, setWorld] = useState('yes');
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('100');
  const [showDetails, setShowDetails] = useState(false);
  const generatedId = useId();
  const detailsId = `dt-quote-details-${generatedId.replace(/:/g, '')}`;
  const value = Number(amount) || 0;
  const selectedPrice = world === 'yes' ? yes : no;

  const clamp = (next: number) => {
    setAmount(
      String(Math.min(1000000, Math.max(0, Math.round(next * 100) / 100))),
    );
  };

  return (
    <section
      data-tour="trade"
      className={`trade-panel dt-trade-panel dt-trade-panel--${world}`}
      aria-label="Amount (USDS)"
    >
      <h2 className="dt-trade-title">Trade</h2>

      <fieldset disabled={disabled} className="dt-trade-fields">
        <legend className="dt-sr-only sr-only">Trade controls</legend>

        <div className="dt-trade-control-group">
          <span className="dt-trade-control-label">Outcome</span>
          <div className="dt-trade-segmented">
            <Segmented
              label="Outcome"
              value={world}
              onChange={setWorld}
              options={[
                { value: 'yes', label: 'If Yes' },
                { value: 'no', label: 'If No' },
              ]}
            />
          </div>
        </div>

        <div className="dt-trade-control-group">
          <span className="dt-trade-control-label">Side</span>
          <div className="dt-trade-segmented">
            <Segmented
              label="Buy"
              value={side}
              onChange={setSide}
              options={[
                { value: 'buy', label: 'Buy' },
                { value: 'sell', label: 'Sell' },
              ]}
              variant="underline"
            />
          </div>
        </div>

        <div className="dt-trade-amount-group">
          <div className="dt-amount-label">
            <label htmlFor="trade-amount">Amount</label>
            <button
              className="dt-max-action"
              type="button"
              onClick={() => clamp(0)}
            >
              Max
            </button>
          </div>

          <div className="dt-amount-field">
            <input
              id="trade-amount"
              inputMode="decimal"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              value={amount}
              onChange={event => {
                const raw = event.target.value;
                if (raw === '') setAmount('');
                else if (Number.isFinite(Number(raw))) clamp(Number(raw));
              }}
              onBlur={() => clamp(value)}
            />
            <span className="dt-amount-currency" aria-hidden="true">
              USDS
            </span>
          </div>

          <div className="dt-quick-amounts">
            {[1, 5, 20, 100].map(number => (
              <button
                className="dt-quick-amount"
                type="button"
                key={number}
                aria-label={`+$${number}`}
                title={`Add ${number} USDS`}
                onClick={() => clamp(value + number)}
              >
                <IconPlus />
                <span>{number}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dt-trade-summary">
          <div className="dt-trade-available">
            <span>Available</span>
            <span aria-label="Not available">
              <IconMinus />
            </span>
          </div>

          <div className="dt-quote-row">
            <span>You receive</span>
            <span>
              <RollingNumber
                value={value / selectedPrice}
                decimals={7}
                suffix="WETH"
              />
            </span>
          </div>

          <div className="dt-quote-row">
            <span>Average price</span>
            <span>
              <RollingNumber
                value={selectedPrice}
                decimals={2}
                suffix="USDS"
              />
            </span>
          </div>

          <div className="dt-quote-row">
            <span>Price impact</span>
            <span>Not available</span>
          </div>

          <button
            className="dt-quote-disclosure"
            type="button"
            aria-expanded={showDetails}
            aria-controls={detailsId}
            onClick={() => setShowDetails(previous => !previous)}
          >
            {showDetails ? 'Hide quote details' : 'Show quote details'}
          </button>

          {showDetails && (
            <div className="dt-quote-details" id={detailsId}>
              <div className="dt-condition-row">
                <span>If Yes</span>
                <span>
                  Receive{' '}
                  <RollingNumber
                    value={value / selectedPrice}
                    decimals={7}
                    suffix="WETH"
                  />
                </span>
              </div>
              <div className="dt-condition-row">
                <span>If No</span>
                <span>
                  Recover <RollingNumber value={value} suffix="USDS" />
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className="dt-action dt-action--primary dt-trade-confirm button btn-bubbles"
          onClick={() =>
            window.dispatchEvent(new CustomEvent('seer:connect'))
          }
        >
          <span>{disabled ? status : 'Confirm'}</span>
          <IconArrowRight />
        </button>
      </fieldset>
    </section>
  );
}
