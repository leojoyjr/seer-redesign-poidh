import { useEffect, useRef, useState } from 'react';
import { type ActiveMilestone, type Milestone } from '../data/milestones';
import { compactUsd } from '../format';
import { verdict } from '../math/twap';
import '../styles/detail-core.css';
import { Avatar } from './Avatar';
import {
  IconArrowLeft,
  IconClock,
  IconCopy,
  IconExternal,
  IconLiquidity,
  IconOrg,
  IconResolve,
  IconTrade,
} from './icons';
import { RollingNumber } from './RollingNumber';
import { Tooltip } from './Tooltip';

type DetailMarket = Milestone | ActiveMilestone;

function readMarketString(
  market: DetailMarket,
  keys: readonly string[],
): string | undefined {
  const record = market as unknown as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function humanizeIdentifier(value: string): string {
  if (!value.includes('-') && !value.includes('_')) return value;

  return value
    .replaceAll('-', ' ')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function getOrganizationName(market: DetailMarket): string {
  const organization = readMarketString(market, [
    'organizationName',
    'organization',
    'orgName',
    'org',
    'dao',
  ]);

  return organization
    ? humanizeIdentifier(organization)
    : `${market.chain} DAO`;
}

function getStatusLabel(market: DetailMarket): string {
  const outcome = readMarketString(market, ['outcome'])?.toUpperCase();

  if (outcome === 'YES' || outcome === 'PASS') return 'Resolved PASS';
  if (outcome === 'NO' || outcome === 'FAIL') return 'Resolved FAIL';

  const normalizedStatus = market.status.toLowerCase();

  if (normalizedStatus === 'active') return 'Active';
  if (normalizedStatus.includes('await')) return 'Awaiting resolution';
  if (normalizedStatus.includes('resolved')) return 'Resolved';

  return market.status;
}

function formatRemainingTime(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  const remainingMinutes = minutes % 60;

  return `${days} days, ${hours} hours, ${remainingMinutes} minutes remaining`;
}

function copyWithFallback(value: string): boolean {
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();

  try {
    return document.execCommand('copy');
  } finally {
    field.remove();
  }
}

export function DetailHeading({
  impact,
  market,
  onLiquidity,
}: {
  onLiquidity: () => void;
  impact: number;
  market: Milestone | ActiveMilestone;
}) {
  const [now, setNow] = useState(Date.now);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (copiedTimer.current !== undefined) {
        window.clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const endTimestamp =
    'endTimestamp' in market ? market.endTimestamp : now;
  const minutes = Math.max(
    0,
    Math.floor((endTimestamp - now) / 60000),
  );
  const organization = getOrganizationName(market);
  const statusLabel = getStatusLabel(market);
  const isActive = market.status === 'Active';
  const question = `${market.question.pre}${market.question.cond}`;
  const impactVerdict = verdict(impact);
  const volume =
    'volume' in market ? compactUsd(market.volume) : 'Not available';
  const tvl = 'tvl' in market ? compactUsd(market.tvl) : 'Not available';

  const handleTrade = () => {
    const panel = document.querySelector<HTMLElement>('[data-tour="trade"]');
    if (!panel) return;

    panel.scrollIntoView({ block: 'start' });

    const firstControl = panel.querySelector<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
    );
    firstControl?.focus({ preventScroll: true });
  };

  const handleCopy = async () => {
    const value = window.location.href;
    let didCopy = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        didCopy = true;
      } catch {
        didCopy = copyWithFallback(value);
      }
    } else {
      didCopy = copyWithFallback(value);
    }

    if (!didCopy) return;

    setCopied(true);

    if (copiedTimer.current !== undefined) {
      window.clearTimeout(copiedTimer.current);
    }

    copiedTimer.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimer.current = undefined;
    }, 2000);
  };

  const stats = [
    {
      label: 'GAP',
      hint: 'PASS versus FAIL spot price gap',
      value: (
        <RollingNumber
          value={impact * 100}
          decimals={2}
          signed
          suffix="%"
          flash
          className={`dt-tone--${impactVerdict.toLowerCase()}`}
        />
      ),
    },
    {
      label: 'Status',
      hint: 'Current market status',
      value: (
        <span
          className={`dt-status ${
            isActive ? 'dt-status--active' : 'dt-status--muted'
          }`}
        >
          <span className="dt-status__dot" aria-hidden="true" />
          <span>{statusLabel}</span>
        </span>
      ),
    },
    {
      label: 'Volume',
      hint: 'Total trading volume in USDS',
      value: volume,
    },
    {
      label: 'Total value locked',
      hint: 'Total value locked',
      value: tvl,
    },
    {
      label: 'Time left',
      hint: 'Time until the market closes',
      value: (
        <span
          className="dt-heading__countdown"
          aria-label={formatRemainingTime(minutes)}
        >
          <span aria-hidden="true">
            <RollingNumber
              value={Math.floor(minutes / 1440)}
              decimals={0}
              suffix="d "
            />
            <RollingNumber
              value={Math.floor(minutes / 60) % 24}
              decimals={0}
              suffix="h "
            />
            <RollingNumber
              value={minutes % 60}
              decimals={0}
              suffix="m"
            />
          </span>
        </span>
      ),
    },
  ];

  return (
    <header
      data-align
      data-avatar={market.token}
      className="dt-heading dt-detail-heading detail-heading"
    >
      <nav className="dt-breadcrumb dt-detail-breadcrumb" aria-label="Breadcrumb">
        <ol className="dt-breadcrumb__list">
          <li>
            <a className="dt-ghost-action dt-breadcrumb__back" href="#/">
              <IconArrowLeft width={16} height={16} />
              <span>Back to milestones</span>
            </a>
          </li>
          <li className="dt-breadcrumb__item">
            <span>Milestones</span>
          </li>
          <li className="dt-breadcrumb__item">
            <span>{organization}</span>
          </li>
          <li
            className="dt-breadcrumb__current"
            aria-current="page"
            title={question}
          >
            {question}
          </li>
        </ol>
      </nav>

      <div className="dt-heading__body dt-heading-main">
        <div className="dt-heading__identity dt-heading-title-row">
          <span className="dt-heading__token dt-heading-token" aria-hidden="true">
            <Avatar
              avatar={market.token}
              size={44}
              chain={market.chain}
            />
          </span>

          <div className="dt-heading__copy dt-heading-copy">
            <h1
              className="dt-heading__title dt-heading-question"
              title={question}
              tabIndex={-1}
              style={{ viewTransitionName: 'milestone-question' }}
            >
              {market.question.pre}
              <span>{market.question.cond}</span>
            </h1>

            <div className="dt-heading__metadata dt-heading-meta">
              <span className="dt-heading__organization dt-heading-org">
                <IconOrg width={16} height={16} />
                <span>Asked by {organization}</span>
              </span>

              <span
                className={`dt-status ${
                  isActive ? 'dt-status--active' : 'dt-status--muted'
                }`}
              >
                <span className="dt-status__dot" aria-hidden="true" />
                <span>{statusLabel}</span>
              </span>

              <span
                className="dt-heading__time dt-heading-time"
                aria-label={formatRemainingTime(minutes)}
              >
                <IconClock width={16} height={16} />
                <span aria-hidden="true">
                  {Math.floor(minutes / 1440)}d{' '}
                  {Math.floor(minutes / 60) % 24}h
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="dt-heading__actions dt-heading-actions detail-actions">
          {isActive ? (
            <button
              className="dt-action dt-action--primary button btn-bubbles"
              type="button"
              onClick={handleTrade}
            >
              <IconTrade width={16} height={16} />
              <span>Trade</span>
            </button>
          ) : (
            <span className="dt-heading__closed" aria-disabled="true">
              Market closed
            </span>
          )}

          <button
            className="dt-action dt-action--secondary button btn-bubbles"
            type="button"
            disabled={!isActive}
            onClick={onLiquidity}
          >
            <IconLiquidity width={16} height={16} />
            <span>Add Liquidity</span>
          </button>

          <a
            className="dt-ghost-action"
            href="https://reality.eth.limo"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Resolve question, opens in a new tab"
          >
            <IconResolve width={16} height={16} />
            <span>Resolve question</span>
            <IconExternal width={16} height={16} />
          </a>

          <button
            className="dt-ghost-action"
            type="button"
            onClick={() => void handleCopy()}
          >
            <IconCopy width={16} height={16} />
            <span>{copied ? 'Link copied' : 'Copy link'}</span>
          </button>
        </div>
      </div>

      <dl className="dt-heading__stats dt-heading-stats">
        {stats.map(stat => (
          <Tooltip key={stat.label} text={stat.hint}>
            <div className="dt-heading__stat dt-heading-stat" tabIndex={0}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          </Tooltip>
        ))}
      </dl>
    </header>
  );
}
