import { useId, useState } from 'react';
import { verdict } from '../math/twap';
import '../styles/detail-core.css';
import { RollingNumber } from './RollingNumber';
import { Tooltip } from './Tooltip';

interface Props {
  pair?: string;
  yes: number;
  no: number;
  spot: number;
}

export function MetricStrip({
  pair = 'WETH/USDS',
  yes,
  no,
  spot,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const generatedId = useId();
  const advancedId = `dt-advanced-metrics-${generatedId.replace(/:/g, '')}`;
  const gap = ((yes - no) / no) * 100;

  const metrics = [
    {
      label: 'Trading Pair',
      hint: '',
      value: pair,
      type: 'pair' as const,
      className: '',
    },
    {
      label: 'PASS Price',
      hint: 'Price if the proposal passes',
      value: yes,
      type: 'number' as const,
      className: 'dt-verdict-value--include',
    },
    {
      label: 'FAIL Price',
      hint: 'Price if the proposal fails',
      value: no,
      type: 'number' as const,
      className: 'dt-verdict-value--exclude',
    },
    {
      label: 'Spot Price',
      hint: 'Current unconditional token price',
      value: spot,
      type: 'number' as const,
      className: '',
    },
    {
      label: 'GAP (spot)',
      hint: 'PASS vs FAIL gap',
      value: gap,
      type: 'gap' as const,
      className: `dt-verdict-value--${verdict(
        (yes - no) / no,
      ).toLowerCase()}`,
    },
  ];

  return (
    <section className="dt-metric-strip" aria-label="Market metrics">
      <dl className="dt-metric-grid metric-strip">
        {metrics.map(metric => {
          const content = (
            <div
              className="dt-metric-cell"
              tabIndex={metric.hint ? 0 : undefined}
            >
              <dt>{metric.label}</dt>
              <dd className={metric.className}>
                {metric.type === 'pair' ? (
                  metric.value
                ) : (
                  <RollingNumber
                    value={metric.value as number}
                    signed={metric.type === 'gap'}
                    suffix={metric.type === 'gap' ? '%' : 'USDS'}
                    decimals={2}
                    flash={metric.type === 'gap'}
                  />
                )}
              </dd>
            </div>
          );

          return metric.hint ? (
            <Tooltip key={metric.label} text={metric.hint}>
              {content}
            </Tooltip>
          ) : (
            <div key={metric.label} className="dt-metric-cell">
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          );
        })}
      </dl>

      <div className="dt-metric-actions">
        <button
          className="dt-metric-disclosure"
          type="button"
          aria-expanded={expanded}
          aria-controls={advancedId}
          onClick={() => setExpanded(previous => !previous)}
        >
          {expanded ? 'Hide advanced metrics' : 'Show advanced metrics'}
        </button>
      </div>

      {expanded && (
        <dl className="dt-advanced-metrics" id={advancedId}>
          <div className="dt-advanced-cell">
            <dt>Spot price</dt>
            <dd>
              <RollingNumber value={spot} decimals={2} suffix="USDS" />
            </dd>
          </div>
          <div className="dt-advanced-cell">
            <dt>Total value locked</dt>
            <dd>Not available</dd>
          </div>
          <div className="dt-advanced-cell">
            <dt>Liquidity depth</dt>
            <dd>Not available</dd>
          </div>
          <div className="dt-advanced-cell">
            <dt>Oracle</dt>
            <dd>Not available</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
