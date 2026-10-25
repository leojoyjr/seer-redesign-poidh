import { marketSignal, publishSignal } from './data/signals';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConnectModal } from './components/ConnectModal';
import { LiquidityModal } from './components/LiquidityModal';
import { MilestoneCard } from './components/MilestoneCard';
import { Avatar } from './components/Avatar';
import { orgAvatars } from './data/avatars';
import { MiniFork } from './components/ClosedStrip';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { buildSeries, presets } from './math/series';
import { twapGap, verdict } from './math/twap';
import { ForkChart } from './components/ForkChart';
import { MetricStrip } from './components/MetricStrip';
import { VerdictGauge } from './components/VerdictGauge';
import { DetailHeading } from './components/DetailHeading';
import { TradePanel } from './components/TradePanel';
import { ActivityTable } from './components/ActivityTable';
import { CreateMarket } from './components/CreateMarket';
import { Landing } from './components/Landing';
import { GuidedTour } from './components/GuidedTour';
import { CommandPalette } from './components/CommandPalette';
import {
  IconArrowLeft,
  IconChevronDown,
} from './components/icons';
import { useRoute, backToLanding } from './router';
import {
  activeMilestones,
  closedMilestones,
  activeMilestone,
  findMilestone,
  organizations,
  verdictPresets,
} from './data/milestones';

export type Theme = 'dark' | 'light';

export default function App() {
  const view = useRoute();
  const [liquidity, setLiquidity] = useState(false);
  const [connect, setConnect] = useState(false);
  const [palette, setPalette] = useState(false);
  const [tour, setTour] = useState<number | null>(null);
  const market = view.kind === 'detail' ? findMilestone(view.id) ?? activeMilestone : activeMilestone;
  const closed = market.status !== 'Active';
  const related = [...activeMilestones, ...closedMilestones]
    .filter(item => item.orgSlug === market.orgSlug && item.id !== market.id)
    .slice(0, 3);
  const orgName = organizations.find(organization => organization.slug === market.orgSlug)?.name;

  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle('light', theme === 'light');
      try {
        localStorage.setItem('futarchy-theme', theme);
      } catch {
        /* Storage is optional. */
      }
    };

    const onTheme = (event: Event) => {
      const theme = (event as CustomEvent<{ theme: Theme }>).detail.theme;
      if (theme === 'dark' || theme === 'light') applyTheme(theme);
    };

    const onConnect = (event: Event) => {
      (event as Event & { seerHandled?: boolean }).seerHandled = true;
      setConnect(true);
    };

    window.addEventListener('seer:theme', onTheme);
    window.addEventListener('seer:connect', onConnect);

    try {
      applyTheme(localStorage.getItem('seer.theme') === 'light' ? 'light' : 'dark');
    } catch {
      applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    }

    return () => {
      window.removeEventListener('seer:theme', onTheme);
      window.removeEventListener('seer:connect', onConnect);
    };
  }, []);

  useEffect(() => {
    const wallet = (window as Window & {
      ethereum?: {
        on?(event: string, listener: (accounts: unknown) => void): void;
        removeListener?(event: string, listener: (accounts: unknown) => void): void;
      };
    }).ethereum;

    if (!wallet?.on) return;

    const onAccounts = (accounts: unknown) => {
      const shell = (window as Window & {
        seerShell?: { setConnected(address: string | null): void };
      }).seerShell;
      const account = Array.isArray(accounts) ? accounts[0] : null;
      shell?.setConnected(
        typeof account === 'string'
          ? `${account.slice(0, 6)}...${account.slice(-4)}`
          : null,
      );
    };

    wallet.on('accountsChanged', onAccounts);
    return () => wallet.removeListener?.('accountsChanged', onAccounts);
  }, []);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const [preset, setPreset] = useState(0);
  useEffect(() => {
    setPreset(0);
  }, [market.id]);

  const series = useMemo(
    () =>
      !closed && preset === 0 && 'spot' in market
        ? marketSignal(market)
        : buildSeries(market.seed, {
            theta: closed
              ? market.impact
              : preset === 0
                ? verdictPresets[market.preset]
                : presets[preset],
            spot: 'spot' in market ? market.spot : 128.42,
          }),
    [preset, market, closed],
  );

  const [chartState, setChartState] = useState({ time: 0, series });
  const updateChart = useCallback(
    (time: number, next: typeof series) => {
      setChartState({ time, series: next });
      if (!closed && preset === 0 && time >= next.params.now) {
        publishSignal(market.id, next);
      }
    },
    [market.id, closed, preset],
  );

  const point = chartState.series.points.reduce((previous, candidate) =>
    Math.abs(candidate.t - chartState.time) < Math.abs(previous.t - chartState.time)
      ? candidate
      : previous,
  );
  const estimate = twapGap(
    chartState.series.points,
    chartState.time,
    series.params.T,
    series.params.kappa,
    series.params.theta,
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;

      if (tour !== null) return;

      if (
        (event.key === '/' ||
          ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k')) &&
        !(target instanceof HTMLElement && target.closest('input, textarea, select'))
      ) {
        event.preventDefault();
        setPalette(true);
        return;
      }

      if (palette || tour !== null || document.querySelector('dialog[open]')) return;
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || target.closest('input, textarea, select')))
      ) {
        return;
      }

      if (event.key === 'Escape' && view.kind === 'detail') backToLanding();
      if (event.key.toLowerCase() === 'v' && !event.repeat) {
        setPreset(current => (current + 1) % presets.length);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view.kind, palette, tour]);

  const presetControls = (
    <div className="chart-preset-control ap-preset-control">
      <span className="chart-preset-label ap-preset-label">
        Verdict preset
      </span>
      <div
        className="chart-preset-options ap-preset-options"
        role="group"
        aria-label="Verdict presets"
      >
        {presets.map((value, index) => {
          const label = index === 0 ? 'Live' : verdict(value);
          return (
            <button
              key={`${index}-${value}`}
              type="button"
              className="chip ap-preset-button"
              aria-pressed={preset === index}
              aria-label={`${label} verdict preset`}
              onClick={() => setPreset(index)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <kbd className="ap-preset-shortcut">V</kbd>
    </div>
  );

  return (
    <div
      className="app-shell ap-shell"
      data-view={view.kind}
      data-milestone={view.kind === 'detail' ? view.id : undefined}
      data-verdict-preset={presets[preset]}
    >
      <Header onSearch={() => setPalette(true)} onTour={() => setTour(0)} />
      <main
        id="main"
        className={
          view.kind === 'list'
            ? 'page landing-main ap-page ap-main ap-main--landing'
            : 'page foundation-main ap-page ap-main ap-main--foundation'
        }
        aria-label="Active Milestones"
      >
        {view.kind === 'create' ? (
          <CreateMarket />
        ) : view.kind === 'list' ? (
          <Landing org={view.org} loading={loading} />
        ) : (
          <div className="ap-detail-composition">
            <nav
              className="detail-breadcrumb ap-breadcrumb"
              data-align
              aria-label="Breadcrumb"
            >
              <button
                className="icon-button ap-icon-button ap-breadcrumb__back"
                type="button"
                aria-label="Back"
                title="Back to milestones"
                onClick={backToLanding}
              >
                <IconArrowLeft width={20} height={20} />
                <span className="sr-only">Back to milestones</span>
              </button>

              <ol className="ap-breadcrumb__list">
                <li className="ap-breadcrumb__item">
                  <a className="ap-breadcrumb__link" href="#/">
                    Milestones
                  </a>
                </li>

                <li className="ap-breadcrumb__item">
                  <span
                    className="breadcrumb-separator ap-breadcrumb__separator"
                    aria-hidden="true"
                  >
                    <IconChevronDown width={16} height={16} />
                  </span>
                  <a
                    className="ap-breadcrumb__link ap-breadcrumb__link--organization"
                    href={`#/org/${market.orgSlug}`}
                  >
                    <span
                      className="ap-breadcrumb__avatar"
                      aria-hidden="true"
                    >
                      <Avatar
                        avatar={orgAvatars[market.orgSlug]}
                        size={20}
                      />
                    </span>
                    <span className="ap-breadcrumb__label">
                      {organizations.find(organization => organization.slug === market.orgSlug)?.name}
                    </span>
                  </a>
                </li>

                <li className="ap-breadcrumb__item ap-breadcrumb__item--current">
                  <span
                    className="breadcrumb-separator ap-breadcrumb__separator"
                    aria-hidden="true"
                  >
                    <IconChevronDown width={16} height={16} />
                  </span>
                  <span
                    className="ap-breadcrumb__current"
                    aria-current="page"
                    title={`${market.token} · ${market.proposal}`}
                  >
                    <span
                      className="ap-breadcrumb__avatar"
                      aria-hidden="true"
                    >
                      <Avatar avatar={market.token} size={20} />
                    </span>
                    <span className="ap-breadcrumb__label">
                      {market.token} · {market.proposal}
                    </span>
                  </span>
                </li>
              </ol>
            </nav>

            <DetailHeading
              market={market}
              impact={closed ? market.impact : (point.yes - point.no) / point.no}
              onLiquidity={() => setLiquidity(true)}
            />

            <div
              data-align
              className="signature-grid ap-detail-grid"
            >
              <div
                className="card chart-card ap-card ap-chart-card"
                style={{ viewTransitionName: 'milestone-chart' }}
              >
                <ForkChart
                  header={presetControls}
                  series={series}
                  key={market.id}
                  nowIndex={closed ? series.points.length - 1 : series.nowIndex}
                  mode="detail"
                  onNowChange={updateChart}
                />
              </div>

              <aside
                className="detail-sidebar ap-detail-sidebar"
                aria-label="Market controls"
              >
                <VerdictGauge
                  value={closed ? market.impact : estimate}
                  locked={closed || chartState.time >= series.params.T}
                />
                <TradePanel
                  key={market.id}
                  yes={point.yes}
                  no={point.no}
                  disabled={closed}
                  status={market.status}
                />
                <MetricStrip
                  pair={'pair' in market ? market.pair : `${market.token}/USDS`}
                  yes={point.yes}
                  no={point.no}
                  spot={point.spot}
                />
              </aside>

              <ActivityTable key={market.id} historical={closed} />
            </div>

            {related.length > 0 && (
              <section
                data-align
                className="more-section ap-more-section"
              >
                <div className="section-heading ap-section-heading">
                  <h2>More from {orgName}</h2>
                </div>

                <div
                  className="more-strip ap-more-strip"
                  role="list"
                >
                  {related.map(item => (
                    <div
                      key={item.id}
                      className={`ap-more-item ${
                        'spot' in item
                          ? 'ap-more-item--lane'
                          : 'ap-more-item--closed'
                      }`}
                      role="listitem"
                    >
                      {'spot' in item ? (
                        <MilestoneCard milestone={item} />
                      ) : (
                        <a
                          className="card closed-card ap-card ap-more-card ap-more-card--closed"
                          data-avatar={item.token}
                          data-org={item.orgSlug}
                          href={`#/m/${item.id}`}
                        >
                          <div className="ap-more-card__heading">
                            <Avatar avatar={item.token} size={32} />
                            <h3>
                              {item.question.pre}
                              <span>{item.question.cond}</span>
                            </h3>
                          </div>

                          <div
                            className="ap-more-card__fork"
                            aria-hidden="true"
                          >
                            <MiniFork outcome={item.outcome} />
                          </div>

                          <div className="ap-more-card__metadata">
                            <span className="ap-more-card__status">
                              <span
                                className="ap-more-card__status-dot"
                                aria-hidden="true"
                              />
                              <span>
                                {item.status} {item.outcome}
                              </span>
                            </span>
                            <span className="ap-more-card__impact">
                              Impact {(item.impact * 100).toFixed(2)}%
                            </span>
                          </div>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />

      {connect && <ConnectModal onClose={() => setConnect(false)} />}
      {liquidity && <LiquidityModal onClose={() => setLiquidity(false)} />}
      {palette && (
        <CommandPalette
          onClose={() => setPalette(false)}
          onTour={() => setTour(0)}
        />
      )}
      {tour !== null && (
        <GuidedTour
          initialStep={tour}
          onClose={() => {
            setTour(null);
          }}
        />
      )}
    </div>
  );
}
