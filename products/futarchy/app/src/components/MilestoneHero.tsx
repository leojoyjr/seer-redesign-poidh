import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'motion/react';
import {
  organizations,
  type ActiveMilestone,
} from '../data/milestones';
import { orgAvatars } from '../data/avatars';
import { TradeTicker } from './TradeTicker';
import { useLiveTrades, type LiveFeed } from './useLiveTrades';
import { useSignalPoint } from '../data/signals';
import { verdict } from '../math/twap';
import { Avatar } from './Avatar';
import { MarketSignal } from './MarketSignal';
import { CountdownChip } from './MilestoneCard';
import { SignalList } from './SignalList';
import { IconArrowRight, IconPlus } from './icons';

function organizationName(slug: string) {
  return (
    organizations.find(organization => organization.slug === slug)?.name ??
    slug
  );
}

function formatPrice(value: number) {
  const decimals = Math.abs(value) < 1 ? 4 : 2;

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

interface SelectedPreviewProps {
  market: ActiveMilestone;
  markets: ActiveMilestone[];
  index: number;
  select: (index: number) => void;
  reduced: boolean | null;
  feed: LiveFeed;
}

function SelectedPreview({
  market,
  markets,
  index,
  select,
  reduced,
  feed,
}: SelectedPreviewProps) {
  const tabs = useRef<HTMLDivElement>(null);
  const point = useSignalPoint(market);
  const currentVerdict = verdict(point.impact);
  const name = organizationName(market.orgSlug);
  const impactLabel = `${point.impact >= 0 ? '+' : ''}${(
    point.impact * 100
  ).toFixed(2)}%`;

  useEffect(() => {
    const tab = tabs.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );

    if (tab && tabs.current) {
      tabs.current.scrollTo({
        left: tab.offsetLeft,
        behavior: reduced ? 'instant' : 'smooth',
      });
    }
  }, [index, reduced]);

  return (
    <section
      id={`lane-preview-${market.id}`}
      className="f6-preview live-board"
      data-tour="board"
      aria-label={`${market.proposal} chart preview`}
    >
      <span className="f6-sr-only sr-only">
        {market.proposal}. PASS is {formatPrice(point.yes)}, FAIL is{' '}
        {formatPrice(point.no)}, a {impactLabel} gap. The current verdict
        is {currentVerdict}.
      </span>

      <header className="f6-preview__header board-question">
        <div className="f6-preview__identity">
          <span className="f6-preview__avatar">
            <Avatar avatar={market.token} size={32} />
          </span>

          <div className="f6-preview__copy">
            <span className="f6-preview__kicker">
              {market.token} · {market.proposal}
            </span>

            <h3
              className="f6-preview__title"
              title={`${market.question.pre}${market.question.cond}`}
            >
              {market.question.pre}
              {market.question.cond}
            </h3>

            <span className="f6-preview__asked">
              <Avatar avatar={orgAvatars[market.orgSlug]} size={16} />
              Asked by {name}
            </span>
          </div>
        </div>

        <a
          className="f6-cta f6-cta--secondary f6-preview__open btn-bubbles"
          href={`#/m/${market.id}`}
        >
          Open market
          <IconArrowRight />
        </a>
      </header>

      <div
        id="board-signal"
        key={market.id}
        className="f6-preview__signal"
        aria-label={market.proposal}
      >
        <MarketSignal market={market} board />

        <div className="lv-tk-slot"><TradeTicker feed={feed} /></div>

        {markets.length > 1 && (
          <div className="f6-preview__switcher board-switcher">
            <button
              type="button"
              className="f6-preview__nav f6-preview__nav--previous"
              aria-label="Previous milestone"
              onClick={() =>
                select((index - 1 + markets.length) % markets.length)
              }
            >
              <IconArrowRight />
            </button>

            <div
              ref={tabs}
              className="f6-preview__tabs"
              role="tablist"
              aria-label="Milestones"
              onKeyDown={event => {
                if (
                  !['ArrowLeft', 'ArrowRight'].includes(event.key)
                ) {
                  return;
                }

                event.preventDefault();

                const next =
                  (index +
                    (event.key === 'ArrowRight' ? 1 : -1) +
                    markets.length) %
                  markets.length;

                select(next);
                tabs.current
                  ?.querySelectorAll<HTMLButtonElement>('button')
                  [next]?.focus();
              }}
            >
              {markets.map((item, itemIndex) => (
                <button
                  type="button"
                  key={item.id}
                  className="f6-preview__tab"
                  role="tab"
                  aria-selected={itemIndex === index}
                  tabIndex={itemIndex === index ? 0 : -1}
                  aria-controls="board-signal"
                  onClick={() => select(itemIndex)}
                >
                  <Avatar avatar={item.token} size={24} />
                  <span className="f6-preview__tab-label">
                    {item.proposal}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="f6-preview__nav"
              aria-label="Next milestone"
              onClick={() => select((index + 1) % markets.length)}
            >
              <IconArrowRight />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function PreviewSkeleton() {
  return (
    <div
      className="f6-preview f6-preview--loading"
      data-tour="board"
      aria-label="Market chart preview"
      aria-busy="true"
    >
      <div className="f6-preview-skeleton__header" aria-hidden="true">
        <i className="f6-preview-skeleton__line" />
        <i className="f6-preview-skeleton__line" />
      </div>
      <i className="f6-preview-skeleton__chart" aria-hidden="true" />
    </div>
  );
}

export function MilestoneHero({
  markets,
  controls,
  empty,
  loading = false,
  scene,
}: {
  markets: ActiveMilestone[];
  controls?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
  scene?: (market: ActiveMilestone, feed: LiveFeed) => ReactNode;
}) {
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const elapsed = useRef(0);
  const holdUntil = useRef(0);

  const index = markets.length > 0 ? selected % markets.length : 0;
  const market = markets[index];
  const { host, feed, running } = useLiveTrades(market);
  const paused = hovered || focused;

  const select = (next: number) => {
    if (markets.length === 0) return;

    elapsed.current = 0;
    holdUntil.current = performance.now() + 12000;
    setSelected(next);
  };

  useEffect(() => {
    if (paused || reduced || markets.length < 2) return;

    let last = performance.now();

    const timer = window.setInterval(() => {
      const now = performance.now();

      if (
        now >= holdUntil.current &&
        !document.querySelector('[data-touring]') &&
        !document.hidden
      ) {
        elapsed.current += now - last;
      }

      last = now;

      if (elapsed.current >= 8000) {
        elapsed.current = 0;
        setSelected(current => (current + 1) % markets.length);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [paused, reduced, markets.length]);

  const selectedOrganization = market
    ? organizationName(market.orgSlug)
    : null;
  const includeCount = markets.filter(
    item => verdict(item.impact) === 'Include',
  ).length;
  const neutralCount = markets.filter(
    item => verdict(item.impact) === 'Neutral',
  ).length;
  const excludeCount = markets.filter(
    item => verdict(item.impact) === 'Exclude',
  ).length;
  const statusAnnouncement = `${markets.length} active markets, ${includeCount} Include, ${neutralCount} Neutral, ${excludeCount} Exclude`;

  const preview = market ? (
    <SelectedPreview
      market={market}
      markets={markets}
      index={index}
      select={select}
      reduced={reduced}
      feed={feed}
    />
  ) : loading ? (
    <PreviewSkeleton />
  ) : null;

  return (
    <section
      ref={host}
      data-live-running={running}
      data-align
      className="f6-hero"
      aria-label="Live signal board"
    >
      <div className="f6-decision hero-header">
        <div className="f6-decision__copy">
          <h1 className="f6-decision__title">
            What happens to the token if a proposal passes?
          </h1>

          <p className="f6-decision__explainer">
            PASS and FAIL markets forecast the token price under each
            outcome. Their GAP is the signal. The DAO still decides.
          </p>

          <div className="f6-decision__metadata">
            {market && selectedOrganization && (
              <span className="f6-decision__meta">
                <span className="f6-decision__org-avatar">
                  <Avatar avatar={orgAvatars[market.orgSlug]} size={16} />
                </span>
                <span>Asked by {selectedOrganization}</span>
              </span>
            )}

            <span className="f6-decision__meta">
              <i
                className="f6-decision__active-dot"
                aria-hidden="true"
              />
              <span>{markets.length} active markets</span>
            </span>

            {market && (
              <span className="f6-decision__meta">
                <span>Next resolution in</span>
                <CountdownChip
                  end={market.endTimestamp}
                  compact
                />
              </span>
            )}
          </div>
        </div>

        {market && scene?.(market, feed)}

        <div className="f6-decision__side">
          <div className="f6-decision__action-row">
            <div className="f6-decision__actions hero-actions">
            <a
              className="f6-cta f6-cta--primary f6-decision__action btn-bubbles"
              href="#/create"
            >
              <IconPlus />
              Create market
            </a>
            </div>

            <div
              className="f6-decision__summary"
              aria-label="Milestone status"
            >
              {(
                [
                  ['Active', markets.length],
                  ['Include', includeCount],
                  ['Neutral', neutralCount],
                  ['Exclude', excludeCount],
                ] as const
              ).map(([label, count]) => (
                <span
                  className={`f6-decision__status f6-decision__status--${label.toLowerCase()}`}
                  key={label}
                  aria-label={`${label}: ${count}`}
                >
                  <strong>{count}</strong>
                  <span>{label}</span>
                </span>
              ))}
            </div>
          </div>

          <span
            className="f6-sr-only sr-only"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusAnnouncement}
          </span>
        </div>
      </div>

      {controls && (
        <div className="f6-hero__controls">{controls}</div>
      )}

      <section
        id="milestones"
        className="f6-active"
        aria-labelledby="active-title"
      >
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={event => {
            if (
              !(event.relatedTarget instanceof Node) ||
              !event.currentTarget.contains(event.relatedTarget)
            ) {
              setFocused(false);
            }
          }}
        >
          <SignalList
            markets={markets}
            selected={index}
            select={select}
            paused={paused}
            preview={preview}
            empty={empty}
            loading={loading}
          />
        </div>
      </section>
    </section>
  );
}
