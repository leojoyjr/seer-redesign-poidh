import { type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { verdict } from '../math/twap';
import '../styles/detail-core.css';
import { IconLock, IconVerdictNeedle } from './icons';
import { RollingNumber } from './RollingNumber';
import { Tooltip } from './Tooltip';

interface Props {
  value: number;
  locked?: boolean;
}

export function VerdictGauge({ value, locked = false }: Props) {
  const reduced = useReducedMotion();
  const available = Number.isFinite(value);
  const result = available ? verdict(value) : null;
  const position = available
    ? Math.max(0, Math.min(100, ((value + 0.03) / 0.06) * 100))
    : 50;
  const fillScale = Math.abs(
    Math.max(-1, Math.min(1, (position - 50) / 50)),
  );
  const direction =
    !available || value === 0 ? 'zero' : value > 0 ? 'positive' : 'negative';
  const gaugeStyle = {
    '--dt-gauge-position': `${position}%`,
    '--dt-gauge-fill-scale': fillScale,
  } as CSSProperties;

  const gapDescription = !available
    ? 'not available'
    : value > 0
      ? `positive ${Math.abs(value * 100).toFixed(3)} percent`
      : value < 0
        ? `negative ${Math.abs(value * 100).toFixed(3)} percent`
        : 'zero percent';

  const accessibleSummary = available && result
    ? `The five-day average GAP is ${gapDescription}. The verdict is ${result}. The DAO still decides.`
    : 'The five-day average GAP and verdict are unavailable. The DAO still decides.';

  return (
    <Tooltip text="Above +1% is Include, below -1% is Exclude, and the range between is Neutral.">
      <section
        tabIndex={0}
        data-tour="gauge"
        className={`verdict-gauge dt-verdict-gauge dt-verdict-gauge--${
          result?.toLowerCase() ?? 'unavailable'
        } ${locked || reduced ? 'dt-is-static' : ''}`}
        aria-label="5-day TWAP"
      >
        <div className="dt-gauge-heading gauge-heading">
          <h2>5-day average GAP</h2>

          <span className="dt-gauge-heading-value">
            {available ? (
              <RollingNumber
                value={value * 100}
                decimals={3}
                signed
                suffix="%"
                flash
              />
            ) : (
              <span>Not available</span>
            )}

            {locked && (
              <span className="dt-gauge-final">
                <IconLock />
                <span>Final</span>
              </span>
            )}
          </span>
        </div>

        <div className="dt-gauge-zones" aria-hidden="true">
          <span>Exclude</span>
          <span>Neutral</span>
          <span>Include</span>
        </div>

        <div
          className={`dt-gauge-stage dt-gauge-stage--${direction}`}
          style={gaugeStyle}
          aria-hidden="true"
        >
          <span className="dt-gauge-rail">
            <span className="dt-gauge-fill" />
          </span>

          <span className="dt-gauge-tick dt-gauge-tick--exclude">
            <span>-1%</span>
          </span>
          <span className="dt-gauge-tick dt-gauge-tick--center">
            <span>0%</span>
          </span>
          <span className="dt-gauge-tick dt-gauge-tick--include">
            <span>+1%</span>
          </span>

          <span className="dt-gauge-needle-motion gauge-needle" style={gaugeStyle}>
            <span className="dt-gauge-needle verdict-needle" />
          </span>
        </div>

        <div className="dt-gauge-result">
          {result ? (
            <>
              <IconVerdictNeedle />
              <strong aria-current="true">{result}</strong>
            </>
          ) : (
            <strong>Verdict unavailable</strong>
          )}
        </div>

        <p className="dt-gauge-note">The DAO still decides.</p>
        <p className="dt-sr-only sr-only">{accessibleSummary}</p>
      </section>
    </Tooltip>
  );
}
