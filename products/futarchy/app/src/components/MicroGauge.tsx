import type { CSSProperties } from 'react';
import { Tooltip, impactExplanation } from './Tooltip';
import { verdict } from '../math/twap';

export function MicroGauge({ value }: { value: number }) {
  const position = Math.max(0, Math.min(100, (value + 0.03) / 0.06 * 100));
  const style = {
    '--ln-gauge-shift': `${position}%`,
  } as CSSProperties;
  const currentVerdict = verdict(value).toLowerCase();

  return (
    <Tooltip text={impactExplanation(value)}>
      <div
        tabIndex={0}
        className={`ln-micro-gauge ln-micro-gauge--${currentVerdict}`}
        role="img"
        aria-label={`Impact ${(value * 100).toFixed(2)}%`}
      >
        <span className="ln-micro-gauge__rail">
          <span className="ln-micro-gauge__zone" aria-hidden="true" />
          <span className="ln-micro-gauge__center" aria-hidden="true" />
          <i
            className="ln-micro-gauge__needle"
            style={style}
            aria-hidden="true"
          />
        </span>
      </div>
    </Tooltip>
  );
}
