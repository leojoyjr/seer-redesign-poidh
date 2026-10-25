import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { useReducedMotion } from 'motion/react';
import { compactUsd } from '../format';
import {
  organizations,
  type ActiveMilestone,
} from '../data/milestones';
import { useSignalPoint } from '../data/signals';
import { verdict } from '../math/twap';
import { Avatar } from './Avatar';
import { CountdownChip } from './MilestoneCard';
import { RollingNumber } from './RollingNumber';
import { GlyphStrip } from './GlyphStrip';
import {
  IconArrowRight,
  IconFork,
  IconOrg,
  IconToken,
  IconVerdictNeedle,
} from './icons';

interface SignalListProps {
  markets: ActiveMilestone[];
  selected: number;
  select: (index: number) => void;
  paused: boolean;
  preview?: ReactNode;
  empty?: ReactNode;
  loading?: boolean;
}

interface SignalLaneProps {
  market: ActiveMilestone;
  index: number;
  selected: boolean;
  select: (index: number) => void;
  paused: boolean;
  marketCount: number;
  loading: boolean;
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

function gapSpeech(value: number) {
  const percentage = Math.abs(value * 100).toFixed(2);

  if (Math.abs(value) < 0.00005) {
    return 'Zero percent gap';
  }

  return `${value > 0 ? 'Positive' : 'Negative'} ${percentage} percent gap`;
}

function organizationName(slug: string) {
  return (
    organizations.find(organization => organization.slug === slug)?.name ??
    slug
  );
}

function SignalLane({
  market,
  index,
  selected,
  select,
  paused,
  marketCount,
  loading,
}: SignalLaneProps) {
  const reduced = useReducedMotion();
  const point = useSignalPoint(market);
  const laneVerdict = verdict(point.impact);
  const verdictKey = laneVerdict.toLowerCase();
  const ceiling = Math.max(point.yes, point.no, market.spot, 0.0001) * 1.04;
  const passScale = Math.max(0.08, Math.min(1, point.yes / ceiling));
  const failScale = Math.max(0.08, Math.min(1, point.no / ceiling));
  const gapScale = Math.min(1, Math.abs(point.impact) / 0.05);
  const needlePosition = Math.max(-1, Math.min(1, point.impact / 0.05));
  const gapDirection = point.impact >= 0 ? 'pass' : 'fail';
  const impactLabel = `${point.impact >= 0 ? '+' : ''}${(
    point.impact * 100
  ).toFixed(2)}%`;
  const name = organizationName(market.orgSlug);
  const summaryId = `f6-lane-summary-${market.id}`;

  const rowStyle = {
    '--f6-lane-delay': `${Math.min(index, 5) * 40}ms`,
  } as CSSProperties;

  const trackStyle = {
    '--f6-pass-scale': passScale,
    '--f6-fail-scale': failScale,
    '--f6-gap-scale': gapScale,
    '--f6-needle-position': needlePosition,
  } as CSSProperties;

  return (
    <li
      className={[
        'f6-lane signal-row milestone-card',
        `f6-lane--${verdictKey}`,
        selected ? 'f6-lane--selected' : '',
        loading ? 'f6-lane--loading' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-id={market.id}
      data-org={market.orgSlug}
      data-avatar={market.token}
      data-tour="milestone"
      style={rowStyle}
      aria-busy={loading}
    >
      <button
        type="button"
        className="f6-lane__select signal-select"
        aria-label={`${market.proposal} ${market.question.cond}`}
        aria-describedby={summaryId}
        aria-current={selected ? 'true' : undefined}
        aria-expanded={selected}
        aria-controls={
          selected ? `lane-preview-${market.id}` : undefined
        }
        tabIndex={selected ? 0 : -1}
        onFocus={() => select(index)}
        onClick={() => select(index)}
        onDoubleClick={() => {
          location.hash = `/m/${market.id}`;
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            select(index);
            location.hash = `/m/${market.id}`;
          }
        }}
      >
        <span className="f6-lane__identity market-identity">
          <span className="f6-lane__avatar">
            <Avatar avatar={market.token} size={32} />
          </span>

          <span className="f6-lane__copy">
            <span className="f6-lane__kicker lane-eyebrow">
              {market.token} · {market.proposal}
            </span>

            <span
              className="f6-lane__question signal-row-title"
              title={`${market.question.pre}${market.question.cond}`}
            >
              {market.question.pre}
              <span className="f6-lane__condition">
                {market.question.cond}
              </span>
            </span>

            <span className="f6-lane__meta">
              <span className="f6-lane__meta-item f6-lane__meta-item--org">
                <IconOrg />
                <span className={/\s/.test(name) ? "identity-name" : "identity-name identity-name--single"} title={/\s/.test(name) ? undefined : name}>{name}</span>
              </span>

              <span className="f6-lane__meta-item f6-lane__meta-item--chain">
                <IconToken />
                <span className={/\s/.test(market.chain) ? "identity-name" : "identity-name identity-name--single"} title={/\s/.test(market.chain) ? undefined : market.chain}>{market.chain}</span>
              </span>

              <span className="f6-lane__meta-item f6-lane__meta-item--volume">
                <span>Volume {compactUsd(market.volume)}</span>
              </span>

              <span className="f6-lane__meta-item f6-lane__meta-item--time">
                <CountdownChip end={market.endTimestamp} compact />
              </span>
            </span>
          </span>
        </span>

        <span
          className={`f6-lane__signal f6-lane__signal--${gapDirection}`}
          style={trackStyle}
          aria-hidden="true"
        >
          <span className="f6-lane__track f6-lane__track--pass">
            <span className="f6-lane__track-label">PASS</span>
            <span className="f6-lane__rail">
              <i className="f6-lane__rail-fill f6-lane__rail-fill--pass" />
            </span>
            <span className="f6-lane__track-value">
              <RollingNumber
                value={point.yes}
                decimals={priceDecimals(point.yes)}
              />
            </span>
          </span>

          <span className="f6-lane__gap-row">
            <span className="f6-lane__track-label">GAP</span>
            <span className="f6-lane__gap-rail">
              <i className="f6-lane__gap-fill selected-signal-bar" style={{ backgroundColor: 'var(--color-violet-text)' }} />
              <i className="f6-lane__gap-center" />
              <i className="f6-lane__gap-needle" />
            </span>
            <span className="f6-lane__gap-value signal-impact"><strong className="lane-gap-delta">{impactLabel}</strong></span>
          </span>

          <span className="f6-lane__track f6-lane__track--fail">
            <span className="f6-lane__track-label">FAIL</span>
            <span className="f6-lane__rail">
              <i className="f6-lane__rail-fill f6-lane__rail-fill--fail" />
            </span>
            <span className="f6-lane__track-value">
              <RollingNumber
                value={point.no}
                decimals={priceDecimals(point.no)}
              />
            </span>
          </span>
        </span>

        <span className="f6-lane__outcome">
          <IconFork
            className="f6-lane__selected-mark"
            aria-hidden="true"
          />

          <span className="f6-lane__verdict lane-verdict">
            <IconVerdictNeedle className="f6-lane__verdict-icon" />
            <span className="f6-lane__verdict-copy">
              <small>Verdict</small>
              <strong>{laneVerdict}</strong>
            </span>
          </span>
        </span>

        <span id={summaryId} className="f6-sr-only sr-only">
          {market.question.pre}
          {market.question.cond}. PASS price {formatPrice(point.yes)}. FAIL
          price {formatPrice(point.no)}. GAP {gapSpeech(point.impact)}.
          Verdict {laneVerdict}.
        </span>

        {selected && !reduced && marketCount > 1 && (
          <i
            key={market.id}
            className="f6-lane__progress signal-progress"
            style={{
              animationPlayState: paused ? 'paused' : 'running',
            }}
            aria-hidden="true"
          />
        )}
      </button>

      <button
        type="button"
        className="f6-lane__open"
        aria-label="Open"
        onClick={event => {
          event.stopPropagation();
          location.hash = `/m/${market.id}`;
        }}
      >
        <IconArrowRight />
      </button>
    </li>
  );
}

function LoadingLane({ index }: { index: number }) {
  const style = {
    '--f6-lane-delay': `${Math.min(index, 5) * 40}ms`,
  } as CSSProperties;

  return (
    <li
      className="f6-lane f6-lane--skeleton"
      style={style}
      aria-hidden="true"
    >
      <span className="f6-lane-skeleton__identity">
        <i className="f6-lane-skeleton__avatar" />
        <span className="f6-lane-skeleton__copy">
          <i className="f6-lane-skeleton__line" />
          <i className="f6-lane-skeleton__line" />
        </span>
      </span>
      <i className="f6-lane-skeleton__signal" />
      <i className="f6-lane-skeleton__outcome" />
    </li>
  );
}

function useDesktopBoard() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : true,
  );

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesktop(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  return desktop;
}

export function SignalList({
  markets,
  selected,
  select,
  paused,
  preview,
  empty,
  loading = false,
}: SignalListProps) {
  const desktop = useDesktopBoard();
  const listRef = useRef<HTMLUListElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      setOverflows(false);
      setCanScrollForward(false);
      return;
    }

    const check = () => {
      const nextOverflows =
        desktop && list.scrollHeight > list.clientHeight + 1;
      const nextCanScroll =
        nextOverflows &&
        list.scrollTop + list.clientHeight < list.scrollHeight - 1;

      setOverflows(nextOverflows);
      setCanScrollForward(nextCanScroll);
    };

    const frame = window.requestAnimationFrame(check);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(check);

    observer?.observe(list);
    window.addEventListener('resize', check);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [desktop, loading, markets.length]);

  const updateScrollFade = () => {
    const list = listRef.current;

    if (!list || !overflows) {
      setCanScrollForward(false);
      return;
    }

    setCanScrollForward(
      list.scrollTop + list.clientHeight < list.scrollHeight - 1,
    );
  };

  const focusLane = (index: number) => {
    const lane =
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        '.f6-lane__select',
      )[index];

    lane?.focus({ preventScroll: true });
    lane?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  };

  const handleListKeyDown = (
    event: ReactKeyboardEvent<HTMLUListElement>,
  ) => {
    const target =
      event.target instanceof Element
        ? event.target.closest('.f6-lane__select')
        : null;
    const arrowDirection =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0;

    if (markets.length === 0) return;

    if (arrowDirection && target) {
      event.preventDefault();

      const next =
        (selected + arrowDirection + markets.length) % markets.length;

      select(next);
      focusLane(next);
      return;
    }

    if (!overflows) return;

    let next: number | null = null;

    if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = markets.length - 1;
    } else if (
      event.key === 'PageUp' ||
      event.key === 'PageDown'
    ) {
      const visibleRows = Math.max(
        1,
        Math.floor((event.currentTarget.clientHeight || 104) / 104),
      );
      const direction = event.key === 'PageDown' ? 1 : -1;

      next = Math.max(
        0,
        Math.min(
          markets.length - 1,
          selected + direction * visibleRows,
        ),
      );
    }

    if (next === null) return;

    event.preventDefault();
    select(next);
    focusLane(next);
  };

  const renderRows = (includePreview: boolean) => {
    if (loading && markets.length === 0) {
      return Array.from({ length: 5 }, (_, index) => (
        <Fragment key={`loading-lane-${index}`}>
          <LoadingLane index={index} />

          {includePreview && index === 0 && preview && (
            <li className="f6-preview-slot lane-preview-slot" role="presentation">
              {preview}
            </li>
          )}
        </Fragment>
      ));
    }

    if (markets.length === 0) {
      return <li className="f6-lane-list__empty">{empty}</li>;
    }

    return markets.map((market, index) => (
      <Fragment key={market.id}>
        <SignalLane
          market={market}
          index={index}
          selected={selected === index}
          select={select}
          paused={paused}
          marketCount={markets.length}
          loading={loading}
        />

        {includePreview && selected === index && preview && (
          <li className="f6-preview-slot lane-preview-slot" role="presentation">
            {preview}
          </li>
        )}
      </Fragment>
    ));
  };

  return (
    <div className="f6-board live-board-hero">
      <header className="f6-board__header">
        <span className="f6-board__heading">
          <i className="f6-board__active-dot" aria-hidden="true" />
          <h2 id="active-title">Active milestones</h2>
          <span className="f6-board__count">
            {markets.length} active
          </span>
        </span>

        <GlyphStrip />
      </header>

      <div className="f6-board__grid">
        <div
          className={[
            'f6-lane-scroll',
            canScrollForward ? 'f6-lane-scroll--fade' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <ul
            ref={listRef}
            className={[
              'f6-lane-list signal-list',
              markets.length === 0 ? 'f6-lane-list--empty' : '',
              loading ? 'f6-lane-list--loading' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-tour="switcher"
            role="list"
            aria-label="Active milestones"
            aria-labelledby="active-title"
            aria-busy={loading}
            tabIndex={overflows ? 0 : undefined}
            onKeyDown={handleListKeyDown}
            onScroll={updateScrollFade}
          >
            {renderRows(!desktop)}
          </ul>
        </div>

        {desktop && preview && (
          <div className="f6-board__preview lane-preview-slot" role="presentation">
            {preview}
          </div>
        )}
      </div>
    </div>
  );
}
