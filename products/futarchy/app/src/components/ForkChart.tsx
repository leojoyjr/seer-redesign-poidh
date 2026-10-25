import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { appendTick, projectPoint } from '../math/forecast';
import { normal, mulberry32 } from '../math/rng';
import type { Series, SeriesPoint } from '../math/series';
import { Field } from '../chart/field';
import { SignalPulse } from '../chart/pulse';
import { Tooltip } from './Tooltip';
import { IconPause, IconPlay } from './icons';
import {
  detailPlotLeft,
  detailPlotRight,
  drawFork,
} from './forkRenderer';
import '../styles/chart.css';

declare global {
  interface Window {
    __futarchyTest?: {
      setMomentum: (level: 'high' | 'low') => void;
    };
  }
}

export interface ForkChartProps {
  series: Series;
  nowIndex: number;
  mode: 'hero' | 'detail' | 'card' | 'mini';
  header?: ReactNode;
  onHover?: (point: SeriesPoint | null) => void;
  onNowChange?: (time: number, series: Series) => void;
}

type RangePreset = '1h' | '1d' | '5d' | '1m' | 'all';
type DisplayMode = 'combined' | 'gap' | 'field';
type SortKey = 'time' | 'yes' | 'no' | 'impact' | 'verdict';
type SortDirection = 'ascending' | 'descending';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface EndLabel {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

const DAY_MS = 86_400_000;

const RANGE_OPTIONS: readonly SegmentOption<RangePreset>[] = [
  { value: '1h', label: '1H' },
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1m', label: '1M' },
  { value: 'all', label: 'ALL' },
];

const DISPLAY_OPTIONS: readonly SegmentOption<DisplayMode>[] = [
  { value: 'combined', label: 'Chart' },
  { value: 'gap', label: 'GAP focus' },
  { value: 'field', label: 'Field' },
];

const priceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const smallPriceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const gapFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

const fullDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});

function isRangePreset(value: string | null): value is RangePreset {
  return (
    value === '1h' ||
    value === '1d' ||
    value === '5d' ||
    value === '1m' ||
    value === 'all'
  );
}

function readRangePreset() {
  const value = new URLSearchParams(window.location.search).get(
    'range',
  );
  return isRangePreset(value) ? value : '5d';
}

function readNumberParameter(name: string) {
  const raw = new URLSearchParams(window.location.search).get(name);
  if (raw === null) return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function updateLocationParameters(
  values: Record<string, string | null>,
  push: boolean,
) {
  const url = new URL(window.location.href);

  for (const [name, value] of Object.entries(values)) {
    if (value === null) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  }

  if (push) {
    window.history.pushState(window.history.state, '', url);
  } else {
    window.history.replaceState(window.history.state, '', url);
  }
}

function rangeDuration(preset: RangePreset) {
  switch (preset) {
    case '1h':
      return 1 / 24;
    case '1d':
      return 1;
    case '5d':
      return 5;
    case '1m':
      return 30;
    case 'all':
      return Number.POSITIVE_INFINITY;
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function nearestPoint(
  points: readonly SeriesPoint[],
  time: number,
): SeriesPoint | null {
  const first = points[0];
  if (!first) return null;

  let closest = first;

  for (const candidate of points) {
    if (
      Math.abs(candidate.t - time) <
      Math.abs(closest.t - time)
    ) {
      closest = candidate;
    }
  }

  return closest;
}

function samplePoints<T>(points: readonly T[], limit: number): T[] {
  if (points.length <= limit) return [...points];

  const stride = Math.ceil(points.length / limit);
  const sampled: T[] = [];

  for (let position = 0; position < points.length; position += stride) {
    const point = points[position];
    if (point !== undefined) sampled.push(point);
  }

  const finalPoint = points[points.length - 1];
  if (
    finalPoint !== undefined &&
    sampled[sampled.length - 1] !== finalPoint
  ) {
    sampled.push(finalPoint);
  }

  return sampled;
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return 'Not available';
  const formatter =
    Math.abs(value) < 1 ? smallPriceFormatter : priceFormatter;
  return `${formatter.format(value)} USDS`;
}

function formatGap(value: number) {
  if (!Number.isFinite(value)) return 'Not available';

  const percentage = value * 100;
  const sign = percentage > 0 ? '+' : percentage < 0 ? '−' : '';
  return `${sign}${gapFormatter.format(Math.abs(percentage))}%`;
}

function verdictFor(value: number) {
  if (value > 0.01) return 'Include';
  if (value < -0.01) return 'Exclude';
  return 'Neutral';
}

function formatScrubberTime(time: number) {
  if (Math.abs(time) < 0.05) return 'Now';
  return `${time > 0 ? '+' : '−'}${Math.abs(time).toFixed(1)}d`;
}

function dateForPoint(
  time: number,
  seriesNow: number,
  anchor: number,
) {
  return new Date(anchor + (time - seriesNow) * DAY_MS);
}

function validPoint(point: SeriesPoint) {
  return (
    Number.isFinite(point.t) &&
    Number.isFinite(point.spot) &&
    Number.isFinite(point.yes) &&
    Number.isFinite(point.no) &&
    Number.isFinite(point.impact)
  );
}

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function ChartSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  const selectedIndex = Math.max(
    0,
    options.findIndex(option => option.value === value),
  );

  const style = {
    '--ch-segment-count': String(options.length),
    '--ch-segment-index': String(selectedIndex),
  } as CSSProperties;

  return (
    <div
      className={`ch-segment${compact ? ' ch-segment--compact' : ''}`}
      role="radiogroup"
      aria-label={label}
      style={style}
    >
      <span className="ch-segment__thumb" aria-hidden="true" />
      {options.map((option, optionIndex) => (
        <button
          className="ch-segment__option"
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={event => {
            let nextIndex: number | null = null;

            if (
              event.key === 'ArrowRight' ||
              event.key === 'ArrowDown'
            ) {
              nextIndex = (optionIndex + 1) % options.length;
            } else if (
              event.key === 'ArrowLeft' ||
              event.key === 'ArrowUp'
            ) {
              nextIndex =
                (optionIndex - 1 + options.length) % options.length;
            } else if (event.key === 'Home') {
              nextIndex = 0;
            } else if (event.key === 'End') {
              nextIndex = options.length - 1;
            }

            if (nextIndex === null) return;

            event.preventDefault();
            const next = options[nextIndex];
            if (!next) return;

            onChange(next.value);
            const buttons =
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                '.ch-segment__option',
              );
            buttons?.[nextIndex]?.focus();
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ForkChart({
  series: source,
  nowIndex,
  mode,
  header,
  onHover,
  onNowChange,
}: ForkChartProps) {
  const summaryId = useId();
  const tableId = useId();
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const visible = useRef(true);
  const invalidateRef = useRef<() => void>(() => undefined);
  const revealStarted = useRef(performance.now());
  const random = useRef(normal(mulberry32(8363)));
  const anchor = useRef(Date.now());

  const [momentum, setMomentum] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('pulse'),
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const update = (event: Event) => {
      setMomentum((event as CustomEvent<string>).detail);
    };

    window.__futarchyTest = {
      setMomentum: level =>
        window.dispatchEvent(
          new CustomEvent('futarchy:momentum', {
            detail: level === 'high' ? 'moving' : 'waiting',
          }),
        ),
    };

    window.addEventListener('futarchy:momentum', update);

    return () => {
      window.removeEventListener('futarchy:momentum', update);
      delete window.__futarchyTest;
    };
  }, []);

  const series = useMemo(() => {
    if (momentum !== 'moving' && momentum !== 'waiting') {
      return source;
    }

    const current =
      source.points[nowIndex] ??
      source.points[0];

    if (!current) return source;

    const points = source.points.map(point => {
      const spot =
        current.spot *
        (1 +
          (momentum === 'moving'
            ? 0.08 * (point.t - current.t)
            : 0));

      return {
        ...point,
        spot,
        yes: spot * 1.003,
        no: spot * 0.997,
        impact: 1.003 / 0.997 - 1,
      };
    });

    return { ...source, points };
  }, [source, nowIndex, momentum]);

  const initialTime =
    series.points[nowIndex]?.t ??
    series.points[0]?.t ??
    series.params.now;

  const [live, setLive] = useState(series);
  const [now, setNow] = useState(initialTime);
  const [view, setView] = useState<'Chart' | 'Field'>(() => {
    try {
      return sessionStorage.getItem('futarchy.chart-view') === 'Field'
        ? 'Field'
        : 'Chart';
    } catch {
      return 'Chart';
    }
  });
  const [gapFocus, setGapFocus] = useState(false);
  const [range, setRange] = useState<RangePreset>(readRangePreset);
  const [customStart, setCustomStart] = useState<number | null>(() =>
    readNumberParameter('from'),
  );
  const [hoverTime, setHoverTime] = useState<number | null>(() =>
    readNumberParameter('at'),
  );
  const [locked, setLocked] = useState(
    () => readNumberParameter('at') !== null,
  );
  const [keyboardActive, setKeyboardActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [onscreen, setOnscreen] = useState(true);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  const [tableOpen, setTableOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('ascending');
  const [endLabels, setEndLabels] = useState<EndLabel[]>([]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;

    const media = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );
    const change = () => setReduced(media.matches);

    media.addEventListener('change', change);
    change();

    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    setLive(series);
    setNow(
      series.points[nowIndex]?.t ??
        series.points[0]?.t ??
        series.params.now,
    );
    setPlaying(false);
    revealStarted.current = performance.now();
    invalidateRef.current();
  }, [series, nowIndex]);

  const change = (time: number) => {
    const minimum = Math.min(
      series.params.T,
      series.params.fork + 1,
    );
    const maximum = Math.max(minimum, series.params.T);
    setNow(clamp(time, minimum, maximum));
  };

  useEffect(() => {
    onNowChange?.(now, live);
  }, [now, live, onNowChange]);

  const currentRaw = useMemo(
    () => nearestPoint(live.points, now),
    [live.points, now],
  );

  const bounds = useMemo(() => {
    const domainStart = Math.min(live.params.t0, live.params.T);
    const domainEnd = Math.max(live.params.t0, live.params.T);
    const end = clamp(now, domainStart, domainEnd);
    const duration = rangeDuration(range);
    const presetStart = Number.isFinite(duration)
      ? Math.max(domainStart, end - duration)
      : domainStart;
    const start =
      customStart === null
        ? presetStart
        : clamp(customStart, domainStart, end);

    return { start, end };
  }, [
    live.params.t0,
    live.params.T,
    now,
    range,
    customStart,
  ]);

  const visibleRawPoints = useMemo(
    () =>
      live.points.filter(
        point =>
          point.t >= bounds.start &&
          point.t <= bounds.end &&
          validPoint(point),
      ),
    [live.points, bounds.start, bounds.end],
  );

  const interactionPoints = useMemo(() => {
    if (!currentRaw) return [];

    return samplePoints(visibleRawPoints, 1000).map(point =>
      projectPoint(point, currentRaw, live),
    );
  }, [currentRaw, visibleRawPoints, live]);

  const currentDisplay = useMemo(() => {
    if (!currentRaw) return null;
    return projectPoint(currentRaw, currentRaw, live);
  }, [currentRaw, live]);

  const hoverPoint = useMemo(() => {
    if (hoverTime === null || !currentRaw) return null;

    const raw = nearestPoint(live.points, hoverTime);
    return raw ? projectPoint(raw, currentRaw, live) : null;
  }, [hoverTime, currentRaw, live]);

  useEffect(() => {
    onHover?.(hoverPoint);
  }, [hoverPoint, onHover]);

  const historyState =
    live.points.length === 0
      ? 'empty'
      : live.points.some(point => !validPoint(point))
        ? 'error'
        : visibleRawPoints.length === 0
          ? 'empty'
          : 'ready';

  const accessibleSummary = currentDisplay
    ? `PASS is ${formatPrice(currentDisplay.yes)}, FAIL is ${formatPrice(
        currentDisplay.no,
      )}, a ${formatGap(
        currentDisplay.impact,
      )} gap. The current verdict is ${verdictFor(
        currentDisplay.impact,
      )}.`
    : 'No trades in this range. Choose a longer range.';

  const displayMode: DisplayMode =
    view === 'Field' ? 'field' : gapFocus ? 'gap' : 'combined';

  const renderState = useRef({
    live,
    now,
    hoverTime,
    mode,
    view,
    gapFocus,
    rangeStart: bounds.start,
    rangeEnd: bounds.end,
    reduced,
  });

  renderState.current = {
    live,
    now,
    hoverTime,
    mode,
    view,
    gapFocus,
    rangeStart: bounds.start,
    rangeEnd: bounds.end,
    reduced,
  };

  useEffect(() => {
    const element = canvas.current;
    const container = host.current;
    const chartRoot = root.current;

    if (!element || !container || !chartRoot) return;

    const context = element.getContext('2d');
    if (!context) return;

    const field = new Field();
    const pulse = new SignalPulse();

    element.__labels = [];
    element.__pulse = pulse.diagnostics;

    let frame = 0;
    let previousTime = performance.now();
    let initial = true;
    let pendingPulse = false;
    let lastLive = renderState.current.live;
    let size = {
      width: container.clientWidth,
      height: container.clientHeight,
    };

    const updateEndLabels = () => {
      const next = (element.__labels ?? [])
        .filter(label => /\b(?:PASS|FAIL|YES|NO)\b/i.test(label.text))
        .map(label => ({
          x: label.x,
          y: label.y,
          width: label.w,
          height: label.h,
          text: label.text,
        }));

      setEndLabels(current => {
        const equal =
          current.length === next.length &&
          current.every(
            (label, position) =>
              label.x === next[position]?.x &&
              label.y === next[position]?.y &&
              label.width === next[position]?.width &&
              label.height === next[position]?.height &&
              label.text === next[position]?.text,
          );

        return equal ? current : next;
      });
    };

    const redraw = (time: number) => {
      frame = 0;

      if (!visible.current) {
        previousTime = time;
        return;
      }

      const width = Math.max(0, size.width);
      const height = Math.max(0, size.height);
      if (width === 0 || height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);

      if (
        element.width !== pixelWidth ||
        element.height !== pixelHeight
      ) {
        element.width = pixelWidth;
        element.height = pixelHeight;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const state = renderState.current;
      const delta = Math.min(0.05, (time - previousTime) / 1000);
      previousTime = time;

      if (state.mode === 'detail' && state.view === 'Field') {
        field.draw(
          context,
          width,
          height,
          state.live,
          state.now,
          delta,
          state.reduced,
          pointer.current,
        );

        element.__labels = [];
        pulse.clear();
        element.__pulse = pulse.diagnostics;
        updateEndLabels();

        if (!state.reduced) {
          frame = requestAnimationFrame(redraw);
        }
        return;
      }

      const elapsed = Math.max(
        0,
        time - revealStarted.current,
      );
      const linearProgress = state.reduced
        ? 1
        : Math.min(1, elapsed / 480);
      const reveal = state.reduced
        ? 1
        : 1 - Math.pow(1 - linearProgress, 3);

      const geometry = drawFork(context, width, height, {
        series: state.live,
        now: state.now,
        hover: state.hoverTime,
        mode: state.mode,
        reveal,
        separation: reveal,
        rangeStart: state.rangeStart,
        rangeEnd: state.rangeEnd,
        gapFocus: state.gapFocus,
        root: chartRoot,
      });

      if (geometry) {
        const liveChanged = lastLive !== state.live;
        pulse.update(geometry, initial);

        if ((liveChanged && !initial) || pendingPulse) {
          pulse.tick(geometry, state.reduced, true);
          pendingPulse = false;
        }

        pulse.draw(
          context,
          geometry,
          delta,
          state.reduced,
          true,
        );

        initial = false;
        lastLive = state.live;
      } else {
        pulse.clear();
      }

      element.__pulse = pulse.diagnostics;
      updateEndLabels();

      if (
        !state.reduced &&
        (reveal < 1 || pulse.active)
      ) {
        frame = requestAnimationFrame(redraw);
      }
    };

    const invalidate = () => {
      if (!frame && visible.current) {
        frame = requestAnimationFrame(redraw);
      }
    };

    invalidateRef.current = invalidate;

    const activity = () => {
      pendingPulse = true;
      invalidate();
    };

    window.addEventListener('futarchy:activity', activity);

    let resizeObserver: ResizeObserver | null = null;
    const measure = () => {
      size = {
        width: container.clientWidth,
        height: container.clientHeight,
      };
      invalidate();
    };

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        if (!entry) return;

        size = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
        invalidate();
      });
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', measure);
    }

    let intersectionObserver: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(entries => {
        const entry = entries[0];
        if (!entry) return;

        visible.current = entry.isIntersecting;
        setOnscreen(entry.isIntersecting);
        if (entry.isIntersecting) invalidate();
      });
      intersectionObserver.observe(container);
    }

    let mutationObserver: MutationObserver | null = null;

    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(() => {
        field.clear();
        invalidate();
      });
      mutationObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }

    invalidate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('futarchy:activity', activity);
      window.removeEventListener('resize', measure);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      mutationObserver?.disconnect();
      invalidateRef.current = () => undefined;
    };
  }, [mode]);

  useEffect(() => {
    invalidateRef.current();
  }, [
    live,
    now,
    hoverTime,
    view,
    gapFocus,
    bounds.start,
    bounds.end,
    reduced,
  ]);

  useEffect(() => {
    revealStarted.current = performance.now();
    invalidateRef.current();
  }, [series]);

  useEffect(() => {
    if (!playing || reduced || !onscreen) return;

    let frame = 0;
    let previous = performance.now();

    const advance = (time: number) => {
      const delta = Math.min(0.1, (time - previous) / 1000);
      previous = time;

      if (visible.current) {
        setNow(current =>
          Math.min(series.params.T, current + delta),
        );
      }

      frame = requestAnimationFrame(advance);
    };

    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, series.params.T, onscreen]);

  useEffect(() => {
    if (now >= series.params.T || reduced) {
      setPlaying(false);
    }
  }, [now, series.params.T, reduced]);

  useEffect(() => {
    if (
      mode === 'hero' ||
      reduced ||
      playing ||
      Math.abs(now - live.params.now) > 0.000001
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!visible.current) return;

      setLive(current => {
        const next = appendTick(current, random.current);
        setNow(next.params.now);
        return next;
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [mode, reduced, playing, now, live.params.now]);

  const toggle = () => {
    if (reduced) return;

    if (now >= series.params.T) {
      change(series.params.fork + 1);
    }

    setPlaying(current => !current);
  };

  useEffect(() => {
    if (mode !== 'detail') return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target;

      if (document.querySelector('dialog[open]')) return;
      if (
        event.defaultPrevented ||
        event.key !== ' ' ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest('button, input, select, textarea')))
      ) {
        return;
      }

      event.preventDefault();
      toggle();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const restore = () => {
      setRange(readRangePreset());
      setCustomStart(readNumberParameter('from'));

      const selected = readNumberParameter('at');
      setHoverTime(selected);
      setLocked(selected !== null);
    };

    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    if (!locked) return;

    const dismiss = (event: PointerEvent) => {
      const container = host.current;
      if (
        container &&
        event.target instanceof Node &&
        !container.contains(event.target)
      ) {
        setLocked(false);
        setHoverTime(null);
        updateLocationParameters({ at: null }, false);
      }
    };

    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [locked]);

  const pointAtClientX = (clientX: number) => {
    const container = host.current;
    if (!container || interactionPoints.length === 0) return null;

    const rect = container.getBoundingClientRect();
    const left = detailPlotLeft(rect.width);
    const right = detailPlotRight(rect.width);
    const fraction = clamp(
      (clientX - rect.left - left) / Math.max(1, right - left),
      0,
      1,
    );
    const target =
      bounds.start + fraction * (bounds.end - bounds.start);

    return nearestPoint(interactionPoints, target);
  };

  const selectPreset = (preset: RangePreset) => {
    setRange(preset);
    setCustomStart(null);
    setHoverTime(null);
    setLocked(false);
    updateLocationParameters(
      {
        range: preset,
        from: null,
        at: null,
      },
      true,
    );
  };

  const selectDisplayMode = (next: DisplayMode) => {
    if (next === 'field') {
      setView('Field');
      setGapFocus(false);
    } else {
      setView('Chart');
      setGapFocus(next === 'gap');
    }

    setHoverTime(null);
    setLocked(false);

    try {
      sessionStorage.setItem(
        'futarchy.chart-view',
        next === 'field' ? 'Field' : 'Chart',
      );
    } catch {
      /* Optional storage. */
    }
  };

  const moveKeyboardCrosshair = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (mode !== 'detail' || interactionPoints.length === 0) return;

    if (event.key === ' ') {
      event.preventDefault();
      toggle();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setLocked(false);
      setHoverTime(null);
      updateLocationParameters({ at: null }, false);
      return;
    }

    const activeTime = hoverTime ?? now;
    let activeIndex = 0;
    let activeDistance = Number.POSITIVE_INFINITY;

    for (
      let position = 0;
      position < interactionPoints.length;
      position += 1
    ) {
      const point = interactionPoints[position];
      if (!point) continue;

      const distance = Math.abs(point.t - activeTime);
      if (distance < activeDistance) {
        activeDistance = distance;
        activeIndex = position;
      }
    }

    let nextIndex: number | null = null;
    const step = event.shiftKey ? 5 : 1;

    if (event.key === 'ArrowRight') {
      nextIndex = activeIndex + step;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = activeIndex - step;
    } else if (event.key === 'PageUp' || event.key === 'End') {
      nextIndex = interactionPoints.length - 1;
    } else if (
      event.key === 'PageDown' ||
      event.key === 'Home'
    ) {
      nextIndex = 0;
    }

    if (nextIndex === null) return;

    event.preventDefault();

    const selected =
      interactionPoints[
        clamp(nextIndex, 0, interactionPoints.length - 1)
      ];
    if (!selected) return;

    setHoverTime(selected.t);
    setLocked(true);
    updateLocationParameters(
      { at: selected.t.toFixed(6) },
      false,
    );
  };

  const tableRows = useMemo(() => {
    if (!currentRaw) return [];

    const rows = samplePoints(visibleRawPoints, 1000).map(point =>
      projectPoint(point, currentRaw, live),
    );

    rows.sort((a, b) => {
      let comparison = 0;

      if (sortKey === 'verdict') {
        comparison = verdictFor(a.impact).localeCompare(
          verdictFor(b.impact),
        );
      } else if (sortKey === 'time') {
        comparison = a.t - b.t;
      } else {
        comparison = a[sortKey] - b[sortKey];
      }

      return sortDirection === 'ascending'
        ? comparison
        : -comparison;
    });

    return rows;
  }, [
    currentRaw,
    visibleRawPoints,
    live,
    sortKey,
    sortDirection,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(current =>
        current === 'ascending' ? 'descending' : 'ascending',
      );
      return;
    }

    setSortKey(key);
    setSortDirection('ascending');
  };

  const downloadCsv = () => {
    const escape = (value: string | number) => {
      const text = String(value);
      return `"${text.replaceAll('"', '""')}"`;
    };

    const lines = [
      ['Timestamp', 'PASS', 'FAIL', 'GAP', 'Verdict']
        .map(escape)
        .join(','),
      ...tableRows.map(point => {
        const date = dateForPoint(
          point.t,
          live.params.now,
          anchor.current,
        );

        return [
          date.toISOString(),
          point.yes,
          point.no,
          point.impact,
          verdictFor(point.impact),
        ]
          .map(escape)
          .join(',');
      }),
    ];

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'conditional-price-history.csv';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const tooltipFraction =
    hoverPoint && bounds.end !== bounds.start
      ? clamp(
          (hoverPoint.t - bounds.start) /
            (bounds.end - bounds.start),
          0,
          1,
        )
      : 0.5;

  const tooltipStyle = {
    '--ch-tooltip-x': `${clamp(
      tooltipFraction * 100,
      30,
      70,
    )}%`,
  } as CSSProperties;

  const fullDomainStart = Math.min(
    live.params.t0,
    live.params.T,
  );
  const fullDomainEnd = Math.max(
    live.params.t0,
    live.params.T,
  );
  const fullDomainSpan = Math.max(
    Number.EPSILON,
    fullDomainEnd - fullDomainStart,
  );
  const rangeStartFraction = clamp(
    (bounds.start - fullDomainStart) / fullDomainSpan,
    0,
    1,
  );
  const rangeEndFraction = clamp(
    (bounds.end - fullDomainStart) / fullDomainSpan,
    rangeStartFraction,
    1,
  );

  const scrubberStyle = {
    '--ch-range-start': `${rangeStartFraction * 100}%`,
    '--ch-range-span': String(
      Math.max(0, rangeEndFraction - rangeStartFraction),
    ),
  } as CSSProperties;

  const playMinimum = Math.min(
    live.params.T,
    live.params.fork + 1,
  );
  const playMaximum = Math.max(playMinimum, live.params.T);
  const playValue = clamp(now, playMinimum, playMaximum);
  const rangeStartValue = clamp(
    bounds.start,
    fullDomainStart,
    Math.max(fullDomainStart, bounds.end),
  );

  return (
    <section
      ref={root}
      className={`ch-root ch-root--${mode}`}
      aria-label="TWAP"
      aria-describedby={summaryId}
      data-state={historyState}
    >
      <p id={summaryId} className="ch-sr-only sr-only">
        {accessibleSummary}
      </p>

      {mode === 'detail' && (
        <header className="ch-toolbar">
          <div className="ch-heading">
            <h2 className="ch-title">
              Conditional price history
            </h2>
            {header && (
              <div className="ch-header-slot">{header}</div>
            )}
          </div>

          {currentDisplay && (
            <div
              className="ch-live-values"
              aria-label="Current conditional forecasts"
            >
              <span className="ch-live-value">
                <span>PASS forecast</span>
                <strong>{formatPrice(currentDisplay.yes)}</strong>
              </span>
              <span className="ch-live-value">
                <span>FAIL forecast</span>
                <strong>{formatPrice(currentDisplay.no)}</strong>
              </span>
              <span className="ch-live-value">
                <span>GAP</span>
                <strong>{formatGap(currentDisplay.impact)}</strong>
              </span>
            </div>
          )}

          <div className="ch-toolbar-controls">
            <ChartSegmented
              compact
              label="Time range"
              options={RANGE_OPTIONS}
              value={range}
              onChange={selectPreset}
            />

            <ChartSegmented
              compact
              label="Chart view"
              options={DISPLAY_OPTIONS}
              value={displayMode}
              onChange={selectDisplayMode}
            />

            <button
              className="ch-ghost"
              type="button"
              aria-expanded={tableOpen}
              aria-controls={tableId}
              onClick={() => setTableOpen(current => !current)}
            >
              {tableOpen ? 'Hide data table' : 'View data table'}
            </button>

            <button
              className="ch-ghost"
              type="button"
              disabled={tableRows.length === 0}
              onClick={downloadCsv}
            >
              Download CSV
            </button>
          </div>
        </header>
      )}

      <div
        ref={host}
        onPointerEnter={() => window.dispatchEvent(new Event('futarchy:activity'))}
        className="ch-field fork-canvas"
        data-tour={mode === 'detail' ? 'chart' : undefined}
        onPointerLeave={() => {
          pointer.current.active = false;

          if (!locked && !keyboardActive) {
            setHoverTime(null);
          }
        }}
      >
        <canvas
          className="ch-canvas"
          data-label-mode={mode}
          data-chart-view={mode === 'detail' ? view : 'Chart'}
          ref={canvas}
          aria-label={
            mode === 'detail' && view === 'Field'
              ? 'Field · 5-day TWAP'
              : 'YES Price · NO Price · 5-day TWAP'
          }
        />

        <div
          className="ch-interaction"
          role={mode === 'detail' ? 'slider' : undefined}
          tabIndex={mode === 'detail' ? 0 : undefined}
          aria-label={
            mode === 'detail' ? 'Chart timestamp' : undefined
          }
          aria-valuemin={
            mode === 'detail' ? bounds.start : undefined
          }
          aria-valuemax={
            mode === 'detail' ? bounds.end : undefined
          }
          aria-valuenow={
            mode === 'detail' ? hoverTime ?? now : undefined
          }
          aria-valuetext={
            mode === 'detail' && hoverPoint
              ? `${fullDateFormatter.format(
                  dateForPoint(
                    hoverPoint.t,
                    live.params.now,
                    anchor.current,
                  ),
                )}. PASS ${formatPrice(
                  hoverPoint.yes,
                )}. FAIL ${formatPrice(
                  hoverPoint.no,
                )}. GAP ${formatGap(
                  hoverPoint.impact,
                )}. ${verdictFor(hoverPoint.impact)}.`
              : undefined
          }
          onFocus={() => {
            if (mode !== 'detail') return;

            setKeyboardActive(true);
            if (hoverTime === null) {
              const selected =
                nearestPoint(interactionPoints, now) ??
                interactionPoints[interactionPoints.length - 1];
              if (selected) setHoverTime(selected.t);
            }
          }}
          onBlur={() => {
            setKeyboardActive(false);
            if (!locked) setHoverTime(null);
          }}
          onKeyDown={moveKeyboardCrosshair}
          onPointerMove={event => {
            if (mode !== 'detail') return;

            const rect =
              event.currentTarget.getBoundingClientRect();

            if (view === 'Field') {
              pointer.current = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                active: true,
              };
              invalidateRef.current();
              return;
            }

            const selected = pointAtClientX(event.clientX);
            if (selected) setHoverTime(selected.t);
          }}
          onPointerDown={event => {
            if (mode !== 'detail') return;

            const rect =
              event.currentTarget.getBoundingClientRect();

            if (view === 'Field') {
              pointer.current = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                active: true,
              };
              invalidateRef.current();
              return;
            }

            const selected = pointAtClientX(event.clientX);
            if (!selected) return;

            setHoverTime(selected.t);
            setLocked(true);
            updateLocationParameters(
              { at: selected.t.toFixed(6) },
              false,
            );
          }}
          onPointerUp={() => {
            pointer.current.active = false;
          }}
          onPointerCancel={() => {
            pointer.current.active = false;
          }}
        />

        {view === 'Chart' &&
          endLabels.map(label => {
            const pass = /\b(?:PASS|YES)\b/i.test(label.text);
            const style = {
              left: Math.max(
                0,
                label.x + label.width / 2 - 20,
              ),
              top: Math.max(
                0,
                label.y + label.height / 2 - 20,
              ),
            };

            return (
              <Tooltip
                key={`${label.text}-${label.y}`}
                text={
                  pass
                    ? 'Price if the proposal passes'
                    : 'Price if it fails'
                }
              >
                <span
                  className={`ch-label-hit signal-head ${
                    pass
                      ? 'ch-label-hit--pass'
                      : 'ch-label-hit--fail'
                  }`}
                  tabIndex={0}
                  role="img"
                  aria-label={label.text}
                  style={style}
                />
              </Tooltip>
            );
          })}

        {mode === 'detail' &&
          view === 'Chart' &&
          hoverPoint &&
          historyState === 'ready' && (
            <output
              data-overlay
              className="ch-tooltip"
              style={tooltipStyle}
            >
              <time
                className="ch-tooltip__time"
                dateTime={dateForPoint(
                  hoverPoint.t,
                  live.params.now,
                  anchor.current,
                ).toISOString()}
              >
                {fullDateFormatter.format(
                  dateForPoint(
                    hoverPoint.t,
                    live.params.now,
                    anchor.current,
                  ),
                )}
              </time>

              <span className="ch-tooltip__row">
                <span className="ch-tooltip__label ch-tooltip__label--pass">
                  PASS
                </span>
                <strong>{formatPrice(hoverPoint.yes)}</strong>
              </span>

              <span className="ch-tooltip__row">
                <span className="ch-tooltip__label ch-tooltip__label--fail">
                  FAIL
                </span>
                <strong>{formatPrice(hoverPoint.no)}</strong>
              </span>

              <span className="ch-tooltip__row">
                <span className="ch-tooltip__label">GAP</span>
                <strong>{formatGap(hoverPoint.impact)}</strong>
              </span>

              <span className="ch-tooltip__result">
                {hoverPoint.impact > 0
                  ? `PASS leads by ${formatGap(
                      Math.abs(hoverPoint.impact),
                    )}`
                  : hoverPoint.impact < 0
                    ? `FAIL leads by ${formatGap(
                        Math.abs(hoverPoint.impact),
                      )}`
                    : 'PASS and FAIL are level'}
                . {verdictFor(hoverPoint.impact)}
              </span>
            </output>
          )}

        {historyState !== 'ready' && (
          <div className="ch-state" role="status">
            {historyState === 'error' ? (
              <>
                <strong>Price history could not load.</strong>
                <span>
                  Check your connection and retry.
                </span>
                <button
                  className="ch-utility"
                  type="button"
                  onClick={() => {
                    setLive(series);
                    revealStarted.current = performance.now();
                    invalidateRef.current();
                  }}
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <strong>No trades in this range.</strong>
                <span>Choose a longer range.</span>
                <button
                  className="ch-utility"
                  type="button"
                  onClick={() => selectPreset('all')}
                >
                  View all history
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {mode === 'detail' && (
        <div className="ch-scrubber">
          <button
            className="ch-icon-button"
            type="button"
            disabled={reduced}
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <IconPause width={20} height={20} />
            ) : (
              <IconPlay width={20} height={20} />
            )}
          </button>

          <div
            className="ch-scrub-range"
            style={scrubberStyle}
          >
            <span className="ch-scrub-rail" aria-hidden="true">
              <span className="ch-scrub-fill" />
            </span>

            <input
              className="ch-scrub-input ch-scrub-input--start"
              aria-label="Range start"
              type="range"
              min={fullDomainStart}
              max={Math.max(fullDomainStart, bounds.end)}
              step="any"
              value={rangeStartValue}
              onChange={event => {
                const value = Number(event.target.value);
                setCustomStart(value);
                updateLocationParameters(
                  { from: value.toFixed(6) },
                  false,
                );
              }}
            />

            <input
              className="ch-scrub-input ch-scrub-input--end"
              aria-label="Remaining Time"
              type="range"
              min={playMinimum}
              max={playMaximum}
              step="any"
              value={playValue}
              onChange={event => {
                const value = Number(event.target.value);
                setPlaying(false);
                change(value);
                updateLocationParameters(
                  { at: value.toFixed(6) },
                  false,
                );
              }}
            />
          </div>

          <output className="ch-scrub-time">
            {formatScrubberTime(now)}
          </output>
        </div>
      )}

      {mode === 'detail' && tableOpen && (
        <div
          id={tableId}
          className="ch-data-region"
          aria-label="Conditional price history data"
        >
          <table className="ch-table">
            <caption className="ch-sr-only sr-only">
              Timestamp, PASS forecast, FAIL forecast, GAP, and verdict
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'time'
                      ? sortDirection
                      : 'none'
                  }
                >
                  <button
                    className="ch-sort"
                    type="button"
                    onClick={() => toggleSort('time')}
                  >
                    Timestamp
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'yes'
                      ? sortDirection
                      : 'none'
                  }
                >
                  <button
                    className="ch-sort"
                    type="button"
                    onClick={() => toggleSort('yes')}
                  >
                    PASS
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'no'
                      ? sortDirection
                      : 'none'
                  }
                >
                  <button
                    className="ch-sort"
                    type="button"
                    onClick={() => toggleSort('no')}
                  >
                    FAIL
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'impact'
                      ? sortDirection
                      : 'none'
                  }
                >
                  <button
                    className="ch-sort"
                    type="button"
                    onClick={() => toggleSort('impact')}
                  >
                    GAP
                  </button>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sortKey === 'verdict'
                      ? sortDirection
                      : 'none'
                  }
                >
                  <button
                    className="ch-sort"
                    type="button"
                    onClick={() => toggleSort('verdict')}
                  >
                    Verdict
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(point => {
                const date = dateForPoint(
                  point.t,
                  live.params.now,
                  anchor.current,
                );

                return (
                  <tr key={point.t}>
                    <td data-label="Timestamp">
                      <time
                        dateTime={date.toISOString()}
                        title={fullDateFormatter.format(date)}
                      >
                        {fullDateFormatter.format(date)}
                      </time>
                    </td>
                    <td data-label="PASS">
                      {formatPrice(point.yes)}
                    </td>
                    <td data-label="FAIL">
                      {formatPrice(point.no)}
                    </td>
                    <td data-label="GAP">
                      {formatGap(point.impact)}
                    </td>
                    <td data-label="Verdict">
                      {verdictFor(point.impact)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
