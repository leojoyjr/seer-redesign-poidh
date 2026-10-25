import { useCallback, useMemo, useState } from 'react';
import { compactUsd } from '../format';
import type { ActiveMilestone } from '../data/milestones';
import {
  marketSignal,
  publishSignal,
  useSignalPoint,
} from '../data/signals';
import type { Series } from '../math/series';
import { twapGap, verdict } from '../math/twap';
import { ForkChart } from './ForkChart';
import { MicroGauge } from './MicroGauge';
import { MiniSpark } from './MiniSpark';
import { RollingNumber } from './RollingNumber';
import { Tooltip } from './Tooltip';
import {
  IconArrowRight,
  IconFailLine,
  IconGapBracket,
  IconPassLine,
  IconVerdictNeedle,
} from './icons';

export function useMarketSignal(market: ActiveMilestone) {
  const series = useMemo(() => marketSignal(market), [market]);
  const [live, setLive] = useState(series);

  const update = useCallback(
    (_time: number, next: Series) => {
      setLive(next);
      publishSignal(market.id, next);
    },
    [market.id],
  );

  const point = useSignalPoint(market);
  const lean = twapGap(
    live.points,
    live.params.now,
    live.params.T,
    live.params.kappa,
    live.params.theta,
  );

  return { series, update, point, lean };
}

function priceDecimals(value: number) {
  return Math.abs(value) < 1 ? 4 : 2;
}

function formatPrice(value: number) {
  const decimals = priceDecimals(value);

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function signedGap(value: number) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
}

export function SignalTiles({
  yes,
  no,
}: {
  yes: number;
  no: number;
}) {
  const gap = no === 0 ? 0 : (yes - no) / no;
  const tiles = [
    {
      label: 'PASS price',
      value: yes,
      kind: 'pass',
      text: 'PASS forecasts the token price if the proposal passes.',
    },
    {
      label: 'FAIL price',
      value: no,
      kind: 'fail',
      text: 'FAIL forecasts the token price if the proposal fails.',
    },
    {
      label: 'GAP',
      value: gap * 100,
      kind: 'gap',
      text: 'GAP is the percentage difference between the PASS and FAIL forecasts.',
    },
  ] as const;

  return (
    <div className="f6-signal-tiles signal-tiles">
      {tiles.map(tile => (
        <Tooltip key={tile.label} text={tile.text}>
          <div
            className={`f6-signal-tile f6-signal-tile--${tile.kind}`}
            tabIndex={0}
            data-tour={tile.kind === 'gap' ? 'impact' : undefined}
          >
            <span>{tile.label}</span>
            <RollingNumber
              value={tile.value}
              decimals={tile.kind === 'gap' ? 2 : priceDecimals(tile.value)}
              signed={tile.kind === 'gap'}
              suffix={tile.kind === 'gap' ? '%' : ''}
              flash
            />
            {tile.kind === 'gap' && <MicroGauge value={gap} />}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}

export function MarketSignal({
  market,
  mini = false,
  board = false,
}: {
  market: ActiveMilestone;
  mini?: boolean;
  board?: boolean;
}) {
  const { series, update, point, lean } = useMarketSignal(market);
  const currentVerdict = verdict(point.impact);
  const verdictKey = currentVerdict.toLowerCase();
  const impactLabel = signedGap(point.impact);
  const summary = `${market.proposal}. PASS is ${formatPrice(
    point.yes,
  )}, FAIL is ${formatPrice(
    point.no,
  )}, a ${impactLabel} gap. The current verdict is ${currentVerdict}.`;

  if (board || mini) {
    return (
      <div
        className={[
          'f6-market',
          board ? 'f6-market--board' : 'f6-market--mini',
        ].join(' ')}
      >
        <span className="f6-sr-only sr-only">{summary}</span>

        {board ? (
          <>
            <div className="f6-market__board-chart board-chart">
              <ForkChart series={series} nowIndex={series.nowIndex} mode="card" onNowChange={update} />
            </div>
            <SignalTiles yes={point.yes} no={point.no} />
          </>
        ) : (
        <div className="f6-market__chart" aria-hidden="true">
          <div className="f6-market__plot">
            <MiniSpark market={market} />
          </div>

          <div className="f6-market__end-labels">
            <span className="f6-market__end-label f6-market__end-label--pass">
              <IconPassLine />
              <span>PASS</span>
              <strong>
                <RollingNumber
                  value={point.yes}
                  decimals={priceDecimals(point.yes)}
                />
              </strong>
            </span>

            <span className="f6-market__end-label f6-market__end-label--fail">
              <IconFailLine />
              <span>FAIL</span>
              <strong>
                <RollingNumber
                  value={point.no}
                  decimals={priceDecimals(point.no)}
                />
              </strong>
            </span>
          </div>
        </div>

        )}

        {board ? (
          <div className="f6-market__footer">
            <Tooltip text="GAP is the percentage difference between the PASS and FAIL forecasts.">
              <span
                className="f6-market__gap"
                tabIndex={0}
                data-tour="impact"
              >
                <IconGapBracket />
                <strong>GAP {impactLabel}</strong>
              </span>
            </Tooltip>

            <span className="f6-market__decision">
              <span
                className={`f6-market__verdict f6-market__verdict--${verdictKey}`}
              >
                <IconVerdictNeedle />
                Verdict: {currentVerdict}
              </span>
              <span className="f6-market__dao-note">
                The DAO still decides.
              </span>
            </span>
          </div>
        ) : (
          <div className="f6-market__footer">
            <span className="f6-market__mini-meta">
              <span>Volume {compactUsd(market.volume)}</span>
              <span>GAP {impactLabel}</span>
            </span>
            <span className="f6-market__mini-arrow" aria-hidden="true">
              <IconArrowRight />
            </span>
          </div>
        )}
      </div>
    );
  }

  const leanVerdict = verdict(lean);
  const leanVerdictKey = leanVerdict.toLowerCase();

  return (
    <div className="f6-market f6-market--full">
      <div className="f6-market__fork-chart">
        <ForkChart
          series={series}
          nowIndex={series.nowIndex}
          mode="card"
          onNowChange={update}
        />
      </div>

      <SignalTiles yes={point.yes} no={point.no} />

      <div className="f6-market__full-footer">
        <span
          className={`f6-market__verdict f6-market__verdict--${leanVerdictKey}`}
        >
          <IconVerdictNeedle />
          {leanVerdict} {signedGap(lean)}
        </span>

        <a
          href={`#/m/${market.id}`}
          className="f6-cta f6-cta--secondary f6-market__open"
        >
          Open
          <IconArrowRight />
        </a>
      </div>
    </div>
  );
}
