import { useState, type CSSProperties } from 'react';
import { orgAvatars } from '../data/avatars';
import {
  closedMilestones,
  organizations,
  type Milestone,
} from '../data/milestones';
import { Avatar } from './Avatar';
import { IconArrowRight, IconPlus } from './icons';

type ResolutionTone = 'pass' | 'fail' | 'awaiting';

const gapNumberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatGap(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return `${sign}${gapNumberFormatter.format(Math.abs(value) * 100)}%`;
}

function questionText(market: Milestone): string {
  return `${market.question.pre}${market.question.cond}`;
}

function organizationName(slug: string): string {
  return (
    organizations.find(organization => organization.slug === slug)?.name ??
    slug
  );
}

function resolutionState(
  market: Milestone,
): {
  label: string;
  tone: ResolutionTone;
} {
  if (market.outcome === 'YES') {
    return { label: 'Resolved PASS', tone: 'pass' };
  }

  if (market.outcome === 'NO') {
    return { label: 'Resolved FAIL', tone: 'fail' };
  }

  return { label: 'Awaiting resolution', tone: 'awaiting' };
}

export function MiniFork({
  outcome,
}: {
  outcome?: 'YES' | 'NO';
}) {
  const state =
    outcome === 'YES'
      ? 'resolved-pass'
      : outcome === 'NO'
        ? 'resolved-fail'
        : 'awaiting';

  return (
    <svg
      className={`f6-mini-fork f6-mini-fork--${state}`}
      width="88"
      height="48"
      viewBox="0 0 88 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="f6-mini-fork__stem" d="M0 24h24" />
      <path
        className="f6-mini-fork__pass"
        d="M24 24C44 24 44 8 64 8h24"
        pathLength="1"
      />
      <path
        className="f6-mini-fork__fail"
        d="M24 24C44 24 44 40 64 40h24"
        pathLength="1"
      />
      {!outcome && (
        <circle
          className="f6-mini-fork__node"
          cx="24"
          cy="24"
          r="3"
        />
      )}
    </svg>
  );
}

function FinalGap({
  value,
  awaiting,
}: {
  value: number;
  awaiting: boolean;
}) {
  const scale = awaiting ? 0 : Math.min(1, Math.abs(value) / 0.08);
  const shift = awaiting
    ? 0
    : Math.max(-50, Math.min(50, (value / 0.08) * 50));
  const direction = value >= 0 ? 'pass' : 'fail';

  const style = {
    '--f6-final-gap-scale': `${scale}`,
    '--f6-final-gap-shift': `${shift}%`,
  } as CSSProperties;

  const visibleValue = awaiting ? 'Pending' : formatGap(value);
  const accessibleValue = awaiting
    ? 'Final GAP pending'
    : `Final GAP ${visibleValue}`;

  return (
    <div
      className={[
        'f6-final-gap closed-impact',
        `f6-final-gap--${direction}`,
        awaiting ? 'f6-final-gap--pending' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-label={accessibleValue}
    >
      <span className="f6-final-gap__label">Final GAP</span>

      <span className="f6-final-gap__rail" aria-hidden="true">
        <span className="f6-final-gap__fill" />
        <span className="f6-final-gap__needle-anchor">
          <span className="f6-final-gap__needle" />
        </span>
      </span>

      <span className="f6-final-gap__value closed-impact-value">{visibleValue}</span>
    </div>
  );
}

export function ClosedStrip({
  markets = closedMilestones,
}: {
  markets?: Milestone[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const displayed = expanded ? markets : markets.slice(0, 8);

  const showAll = () => {
    setExpanded(true);
    setAnnouncement(`${markets.length} milestones shown.`);
  };

  return (
    <section
      data-align
      className="f6-closed"
      aria-labelledby="closed-title"
    >
      <div className="f6-list-heading">
        <div className="f6-list-heading__title-group">
          <h2 id="closed-title">Recently closed</h2>
          <span className="f6-list-heading__result">
            {markets.length} results
          </span>
        </div>

        <button
          type="button"
          className="f6-list-heading__action"
          disabled={expanded || markets.length <= 8}
          onClick={showAll}
        >
          <IconPlus />
          Show more
        </button>
      </div>

      <div className="f6-closed__list closed-strip" role="list">
        {displayed.map((market, index) => {
          const organization = organizationName(market.orgSlug);
          const resolution = resolutionState(market);
          const awaiting = market.status === 'Awaiting';
          const gapLabel = awaiting
            ? 'Final GAP pending'
            : `Final GAP ${formatGap(market.impact)}`;

          const rowStyle = {
            '--f6-list-row-delay': `${Math.min(index, 5) * 40}ms`,
          } as CSSProperties;

          return (
            <a
              href={`#/m/${market.id}`}
              key={market.id}
              className="f6-closed__row closed-card"
              data-avatar={market.token}
              data-org={market.orgSlug}
              data-status={market.status}
              role="listitem"
              style={rowStyle}
              aria-label={`${organization}. ${questionText(
                market,
              )}. ${resolution.label}. ${gapLabel}.`}
            >
              <div className="f6-closed__primary market-identity">
                <span className="f6-closed__organization">
                  <span
                    className="f6-closed__avatar"
                    aria-hidden="true"
                  >
                    <Avatar
                      avatar={orgAvatars[market.orgSlug]}
                      size={24}
                    />
                  </span>
                  <span className={/\s/.test(organization) ? "identity-name" : "identity-name identity-name--single"} title={/\s/.test(organization) ? undefined : organization}>{organization}</span>
                </span>

                <h3 className="f6-closed__question" title={questionText(market)}>
                  {questionText(market)}
                </h3>
              </div>

              <span className="f6-closed__fork">
                <MiniFork outcome={market.outcome} />
              </span>

              <span
                className={`f6-resolution f6-resolution--${resolution.tone}`}
              >
                <span
                  className="f6-resolution__dot"
                  aria-hidden="true"
                />
                <span>{resolution.label}</span>
              </span>

              <FinalGap
                value={market.impact}
                awaiting={awaiting}
              />

              <span className="f6-closed__open" aria-hidden="true">
                <IconArrowRight />
              </span>
            </a>
          );
        })}
      </div>

      <output
        className="f6-list-sr-only sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </output>
    </section>
  );
}
