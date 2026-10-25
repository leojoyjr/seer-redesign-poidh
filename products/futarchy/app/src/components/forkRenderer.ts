import { drawLabels, threadLabels, type ChartLabel } from '../chart/labels';
import type { PulseGeometry } from '../chart/pulse';
import { projectPoint } from '../math/forecast';
import type { Series, SeriesPoint } from '../math/series';

export const DETAIL_PLOT_LEFT = 56;
export const DETAIL_LABEL_GUTTER = 88;

export function detailPlotLeft(width: number) {
  return width < 480 ? 40 : DETAIL_PLOT_LEFT;
}

export function detailPlotRight(width: number) {
  const gutter = width < 480 ? 16 : DETAIL_LABEL_GUTTER;
  return Math.max(
    detailPlotLeft(width) + 64,
    width - gutter,
  );
}

export interface ChartFrame {
  series: Series;
  now: number;
  mode: 'hero' | 'detail' | 'card' | 'mini';
  hover: number | null;
  reveal: number;
  separation: number;
  rangeStart?: number;
  rangeEnd?: number;
  gapFocus?: boolean;
  root?: HTMLElement | null;
}

export interface ForkGeometry extends PulseGeometry {
  plotLeft: number;
  plotRight: number;
  priceTop: number;
  priceBottom: number;
  gapTop: number;
  gapBottom: number;
}

interface ChartPalette {
  pass: string;
  passText: string;
  fail: string;
  failText: string;
  gap: string;
  text: string;
  text2: string;
  text3: string;
  card: string;
  nested: string;
  line: string;
  grid: string;
  font: string;
  dark: boolean;
}

const axisPriceFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function chartPalette(
  context: CanvasRenderingContext2D,
  frame: ChartFrame,
): ChartPalette {
  const root =
    frame.root ??
    context.canvas.closest<HTMLElement>('.ch-root') ??
    document.documentElement;
  const styles = getComputedStyle(root);
  const textFallback = styles.color || 'CanvasText';
  const cardFallback =
    styles.backgroundColor || 'Canvas';

  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  const text = read('--text', textFallback);
  const card = read('--card', cardFallback);

  return {
    pass: read('--pass', text),
    passText: read('--pass-text', read('--pass', text)),
    fail: read('--fail', text),
    failText: read('--fail-text', read('--fail', text)),
    gap: read('--gap', text),
    text,
    text2: read('--text-2', text),
    text3: read('--text-3', text),
    card,
    nested: read('--nested', card),
    line: read('--line', text),
    grid: read('--color-grid', read('--line', text)),
    font:
      read('--font-ui', '') ||
      '"Inter Tight", "Arial Narrow", Arial, sans-serif',
    dark: document.documentElement.dataset.theme !== 'light',
  };
}

function crisp(value: number) {
  return Math.floor(value) + 0.5;
}

function scale(
  value: number,
  domainStart: number,
  domainEnd: number,
  rangeStart: number,
  rangeEnd: number,
) {
  if (domainStart === domainEnd) {
    return (rangeStart + rangeEnd) / 2;
  }

  return (
    rangeStart +
    ((value - domainStart) / (domainEnd - domainStart)) *
      (rangeEnd - rangeStart)
  );
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

function sampledPoints(
  points: readonly SeriesPoint[],
  limit = 1000,
) {
  if (points.length <= limit) return [...points];

  const stride = Math.ceil(points.length / limit);
  const sampled: SeriesPoint[] = [];

  for (let position = 0; position < points.length; position += stride) {
    const point = points[position];
    if (point) sampled.push(point);
  }

  const finalPoint = points[points.length - 1];
  if (
    finalPoint &&
    sampled[sampled.length - 1] !== finalPoint
  ) {
    sampled.push(finalPoint);
  }

  return sampled;
}

function finitePoint(point: SeriesPoint) {
  return (
    Number.isFinite(point.t) &&
    Number.isFinite(point.spot) &&
    Number.isFinite(point.yes) &&
    Number.isFinite(point.no) &&
    Number.isFinite(point.impact)
  );
}

function relativeTimeLabel(value: number) {
  if (Math.abs(value) < 0.02) return 'Now';

  const sign = value > 0 ? '+' : '−';
  const absolute = Math.abs(value);

  if (absolute < 1) {
    return `${sign}${Math.round(absolute * 24)}h`;
  }

  return `${sign}${absolute.toFixed(absolute < 10 ? 1 : 0)}d`;
}

function displayValue(
  point: SeriesPoint,
  side: 'yes' | 'no',
  separation: number,
) {
  return (
    point.spot +
    (point[side] - point.spot) * separation
  );
}

function drawStepLine(
  context: CanvasRenderingContext2D,
  points: readonly SeriesPoint[],
  x: (point: SeriesPoint) => number,
  y: (point: SeriesPoint) => number,
  color: string,
  dash: readonly number[] = [],
  width = 2,
) {
  const first = points[0];
  if (!first) return;

  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.setLineDash([...dash]);
  context.beginPath();
  context.moveTo(x(first), y(first));

  for (let position = 1; position < points.length; position += 1) {
    const previous = points[position - 1];
    const point = points[position];
    if (!previous || !point) continue;

    context.lineTo(x(point), y(previous));
    context.lineTo(x(point), y(point));
  }

  context.stroke();
  context.restore();
}

function drawRibbon(
  context: CanvasRenderingContext2D,
  points: readonly SeriesPoint[],
  x: (point: SeriesPoint) => number,
  passY: (point: SeriesPoint) => number,
  failY: (point: SeriesPoint) => number,
  palette: ChartPalette,
) {
  context.save();

  for (let position = 1; position < points.length; position += 1) {
    const previous = points[position - 1];
    const point = points[position];
    if (!previous || !point) continue;

    const left = x(previous);
    const right = x(point);
    const top = Math.min(passY(previous), failY(previous));
    const bottom = Math.max(passY(previous), failY(previous));
    const passLeads = previous.yes >= previous.no;

    context.globalAlpha = passLeads ? 0.24 : 0.12;
    context.fillStyle = passLeads
      ? palette.gap
      : palette.fail;
    context.fillRect(
      left,
      top,
      Math.max(0, right - left),
      Math.max(1, bottom - top),
    );
  }

  context.restore();
}

function drawGapFill(
  context: CanvasRenderingContext2D,
  points: readonly SeriesPoint[],
  x: (point: SeriesPoint) => number,
  y: (value: number) => number,
  palette: ChartPalette,
) {
  context.save();

  for (let position = 1; position < points.length; position += 1) {
    const previous = points[position - 1];
    const point = points[position];
    if (!previous || !point) continue;

    const left = x(previous);
    const right = x(point);
    const valueY = y(previous.impact);
    const zeroY = y(0);

    context.globalAlpha = previous.impact >= 0 ? 0.24 : 0.12;
    context.fillStyle =
      previous.impact >= 0 ? palette.gap : palette.fail;
    context.fillRect(
      left,
      Math.min(valueY, zeroY),
      Math.max(0, right - left),
      Math.max(1, Math.abs(valueY - zeroY)),
    );
  }

  context.restore();
}

function drawHorizontalLine(
  context: CanvasRenderingContext2D,
  left: number,
  right: number,
  y: number,
  color: string,
  dash: readonly number[] = [],
  alpha = 1,
) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.setLineDash([...dash]);
  context.beginPath();
  context.moveTo(crisp(left), crisp(y));
  context.lineTo(crisp(right), crisp(y));
  context.stroke();
  context.restore();
}

function drawVerticalLine(
  context: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
  color: string,
  dash: readonly number[] = [],
  alpha = 1,
) {
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.setLineDash([...dash]);
  context.beginPath();
  context.moveTo(crisp(x), crisp(top));
  context.lineTo(crisp(x), crisp(bottom));
  context.stroke();
  context.restore();
}

function drawDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function pulseGeometry(
  series: Series,
  current: SeriesPoint,
  x: number,
  passY: number,
  failY: number,
  gapY: number,
  edge: number,
  end: number,
  palette: ChartPalette,
): ForkGeometry {
  const currentPosition = Math.max(
    0,
    series.points.findIndex(point => point.t === current.t),
  );
  const previous =
    series.points[
      Math.max(series.forkIndex, currentPosition - 12)
    ] ?? current;
  const elapsed = Math.max(1e-9, current.t - previous.t);
  const denominator = Math.max(
    1e-9,
    Math.abs(current.spot) *
      series.params.sigma *
      Math.sqrt(elapsed / 365) *
      2,
  );

  const momentum = (side: 'yes' | 'no') =>
    clamp(
      (current[side] - previous[side]) / denominator,
      -1,
      1,
    );

  return {
    x,
    yes: passY,
    no: failY,
    gapY,
    edge,
    end,
    yesMomentum: momentum('yes'),
    noMomentum: momentum('no'),
    yesAngle:
      -(current.yes >= previous.yes ? 1 : -1) *
      (Math.PI / 3),
    noAngle:
      -(current.no >= previous.no ? 1 : -1) *
      (Math.PI / 3),
    gap: current.impact,
    violet: palette.pass,
    grey: palette.fail,
    dark: palette.dark,
    plotLeft: 0,
    plotRight: end,
    priceTop: 0,
    priceBottom: 0,
    gapTop: 0,
    gapBottom: 0,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function drawDetail(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: ChartFrame,
  palette: ChartPalette,
): ForkGeometry | undefined {
  const currentRaw = nearestPoint(frame.series.points, frame.now);
  if (!currentRaw) return undefined;

  const projected = frame.series.points
    .filter(finitePoint)
    .map(point => projectPoint(point, currentRaw, frame.series));

  if (projected.length === 0) return undefined;

  const domainStart = clamp(
    frame.rangeStart ?? frame.series.params.t0,
    frame.series.params.t0,
    frame.series.params.T,
  );
  const domainEnd = clamp(
    frame.rangeEnd ?? frame.now,
    domainStart,
    frame.series.params.T,
  );

  let visible = projected.filter(
    point => point.t >= domainStart && point.t <= domainEnd,
  );

  if (visible.length < 2) {
    visible = [...projected]
      .sort(
        (a, b) =>
          Math.abs(a.t - domainEnd) -
          Math.abs(b.t - domainEnd),
      )
      .slice(0, 2)
      .sort((a, b) => a.t - b.t);
  }

  visible = sampledPoints(visible);

  const first = visible[0];
  const last = visible[visible.length - 1];
  if (!first || !last) return undefined;

  const left = detailPlotLeft(width);
  const right = detailPlotRight(width);
  const xAxisHeight = 32;
  const fieldGap = 16;
  const priceTop = 24;
  const availableHeight = Math.max(
    160,
    height - priceTop - xAxisHeight,
  );
  const desiredGapHeight = frame.gapFocus
    ? availableHeight * 0.56
    : availableHeight * 0.25;
  const gapHeight = clamp(
    desiredGapHeight,
    96,
    Math.max(96, availableHeight - fieldGap - 80),
  );
  const priceHeight = Math.max(
    80,
    availableHeight - gapHeight - fieldGap,
  );
  const priceBottom = priceTop + priceHeight;
  const gapTop = priceBottom + fieldGap;
  const gapBottom = Math.min(
    height - xAxisHeight,
    gapTop + gapHeight,
  );

  const priceValues = visible.flatMap(point => [
    displayValue(point, 'yes', frame.separation),
    displayValue(point, 'no', frame.separation),
  ]);
  const priceMinimum = Math.min(...priceValues);
  const priceMaximum = Math.max(...priceValues);
  const pricePadding =
    Math.max(
      priceMaximum - priceMinimum,
      Math.abs(last.spot) * 0.001,
      0.0001,
    ) * 0.08;
  const priceDomainMinimum = priceMinimum - pricePadding;
  const priceDomainMaximum = priceMaximum + pricePadding;

  const gapExtent = Math.max(
    0.012,
    ...visible.map(point => Math.abs(point.impact) * 1.16),
  );

  const x = (point: SeriesPoint) =>
    scale(
      point.t,
      domainStart,
      domainEnd,
      left,
      right,
    );
  const priceY = (value: number) =>
    scale(
      value,
      priceDomainMinimum,
      priceDomainMaximum,
      priceBottom,
      priceTop,
    );
  const gapY = (value: number) =>
    scale(value, -gapExtent, gapExtent, gapBottom, gapTop);
  const passY = (point: SeriesPoint) =>
    priceY(displayValue(point, 'yes', frame.separation));
  const failY = (point: SeriesPoint) =>
    priceY(displayValue(point, 'no', frame.separation));

  // The host supplies the tonal surface; canvas edge pixels stay transparent.
  context.font = `500 11px ${palette.font}`;
  context.textBaseline = 'middle';
  context.fontKerning = 'normal';

  context.fillStyle = palette.text3;
  context.textAlign = 'left';
  context.fillText('PRICE FIELD', left, 12);
  context.fillText('GAP FIELD', left, gapTop - 8);

  const yTickCount = width < 480 ? 3 : 4;

  for (let position = 0; position < yTickCount; position += 1) {
    const fraction = position / (yTickCount - 1);
    const value =
      priceDomainMaximum -
      fraction * (priceDomainMaximum - priceDomainMinimum);
    const y = priceY(value);

    drawHorizontalLine(
      context,
      left,
      right,
      y,
      palette.grid,
    );

    context.fillStyle = palette.text3;
    context.textAlign = 'right';
    context.fillText(
      axisPriceFormatter.format(value),
      left - 8,
      y,
    );
  }

  const xTickCount = width < 480 ? 3 : 5;

  for (let position = 0; position < xTickCount; position += 1) {
    const fraction = position / (xTickCount - 1);
    const value =
      domainStart + fraction * (domainEnd - domainStart);
    const xPosition = scale(
      value,
      domainStart,
      domainEnd,
      left,
      right,
    );

    drawVerticalLine(
      context,
      xPosition,
      priceTop,
      gapBottom,
      palette.grid,
    );

    context.fillStyle = palette.text3;
    context.textAlign = 'center';
    context.fillText(
      relativeTimeLabel(value),
      clamp(xPosition, left + 24, right - 24),
      height - 12,
    );
  }

  const thresholds = [
    {
      value: 0.01,
      label: '+1% Include threshold',
      dash: [6, 4] as const,
    },
    {
      value: 0,
      label: '0%',
      dash: [] as const,
    },
    {
      value: -0.01,
      label: '−1% Exclude threshold',
      dash: [6, 4] as const,
    },
  ];

  for (const threshold of thresholds) {
    const y = gapY(threshold.value);

    drawHorizontalLine(
      context,
      left,
      right,
      y,
      threshold.value === 0 ? palette.grid : palette.text2,
      threshold.dash,
      threshold.value === 0 ? 1 : 0.36,
    );

    context.fillStyle = palette.text3;
    context.textAlign = 'right';
    context.fillText(threshold.label, right, y - 8);
  }

  if (frame.now >= domainStart && frame.now <= domainEnd) {
    const nowX = scale(
      frame.now,
      domainStart,
      domainEnd,
      left,
      right,
    );

    drawVerticalLine(
      context,
      nowX,
      priceTop,
      gapBottom,
      palette.text2,
      [],
      0.42,
    );
  }

  const revealRight =
    left + (right - left) * clamp(frame.reveal, 0, 1);

  context.save();
  context.beginPath();
  context.rect(
    left,
    priceTop - 8,
    Math.max(0, revealRight - left),
    gapBottom - priceTop + 16,
  );
  context.clip();

  drawRibbon(
    context,
    visible,
    x,
    passY,
    failY,
    palette,
  );
  drawStepLine(
    context,
    visible,
    x,
    passY,
    palette.pass,
    [],
    2,
  );
  drawStepLine(
    context,
    visible,
    x,
    failY,
    palette.fail,
    [6, 4],
    2,
  );

  drawGapFill(context, visible, x, gapY, palette);
  drawStepLine(
    context,
    visible,
    x,
    point => gapY(point.impact),
    last.impact >= 0 ? palette.gap : palette.fail,
    [],
    2,
  );

  context.restore();

  if (frame.hover !== null) {
    const hovered = nearestPoint(visible, frame.hover);

    if (hovered) {
      const hoverX = x(hovered);

      drawVerticalLine(
        context,
        hoverX,
        priceTop,
        gapBottom,
        palette.text2,
        [],
        0.64,
      );
      drawDot(context, hoverX, passY(hovered), 4, palette.pass);
      drawDot(context, hoverX, failY(hovered), 4, palette.fail);
      drawDot(
        context,
        hoverX,
        gapY(hovered.impact),
        3,
        hovered.impact >= 0 ? palette.gap : palette.fail,
      );
    }
  }

  const labels: ChartLabel[] = [
    ...threadLabels(
      width < 480 ? right - 8 : right + 8,
      passY(last),
      failY(last),
      displayValue(last, 'yes', frame.separation),
      displayValue(last, 'no', frame.separation),
      palette.passText,
      palette.failText,
      {
        align: width < 480 ? 'right' : 'left',
        minimumSeparation: 20,
        pill: true,
      },
    ),
  ];

  if (frame.now >= domainStart && frame.now <= domainEnd) {
    labels.push({
      x:
        scale(
          frame.now,
          domainStart,
          domainEnd,
          left,
          right,
        ) + 8,
      y: priceTop + 8,
      text: 'Now',
      color: palette.text2,
      avoidThreads: false,
      pill: true,
    });
  }

  drawLabels(
    context,
    width,
    priceBottom + 8,
    labels,
    palette.card,
    [
      visible.map(point => ({
        x: x(point),
        y: passY(point),
      })),
      visible.map(point => ({
        x: x(point),
        y: failY(point),
      })),
    ],
  );

  const latestRaw =
    nearestPoint(frame.series.points, last.t) ?? currentRaw;
  const geometry = pulseGeometry(
    frame.series,
    latestRaw,
    x(last),
    passY(last),
    failY(last),
    gapY(last.impact),
    gapY(last.impact >= 0 ? 0.01 : -0.01),
    right,
    palette,
  );

  return {
    ...geometry,
    plotLeft: left,
    plotRight: right,
    priceTop,
    priceBottom,
    gapTop,
    gapBottom,
  };
}

function drawBoard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: ChartFrame,
  palette: ChartPalette,
): ForkGeometry | undefined {
  const currentRaw = nearestPoint(frame.series.points, frame.now);
  if (!currentRaw) return undefined;

  let points = frame.series.points
    .filter(
      point =>
        finitePoint(point) &&
        point.t >= frame.series.params.fork,
    )
    .map(point => projectPoint(point, currentRaw, frame.series));

  points = sampledPoints(points);
  const first = points[0];
  const last = points[points.length - 1];

  if (!first || !last) return undefined;

  const mini = frame.mode === 'mini';
  const left = mini ? 8 : 16;
  const right =
    width < 360
      ? width - 16
      : width - DETAIL_LABEL_GUTTER;
  const top = 16;
  const bottom = Math.max(top + 48, height - 24);

  const values = points.flatMap(point => [
    displayValue(point, 'yes', frame.separation),
    displayValue(point, 'no', frame.separation),
  ]);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding =
    Math.max(maximum - minimum, Math.abs(last.spot) * 0.001) *
    0.12;

  const x = (point: SeriesPoint) =>
    scale(
      point.t,
      first.t,
      last.t,
      left,
      Math.max(left + 40, right),
    );
  const y = (value: number) =>
    scale(
      value,
      minimum - padding,
      maximum + padding,
      bottom,
      top,
    );
  const passY = (point: SeriesPoint) =>
    y(displayValue(point, 'yes', frame.separation));
  const failY = (point: SeriesPoint) =>
    y(displayValue(point, 'no', frame.separation));

  // The host supplies the tonal surface; canvas edge pixels stay transparent.
  context.font = `500 11px ${palette.font}`;
  context.textBaseline = 'middle';

  for (let position = 0; position < 3; position += 1) {
    const lineY =
      top + ((bottom - top) * position) / 2;
    drawHorizontalLine(
      context,
      left,
      right,
      lineY,
      palette.grid,
    );
  }

  if (!mini) {
    context.fillStyle = palette.text3;
    context.textAlign = 'left';
    context.fillText(
      axisPriceFormatter.format(maximum + padding),
      left,
      top,
    );
    context.fillText(
      axisPriceFormatter.format(minimum - padding),
      left,
      bottom,
    );
  }

  const nowX = scale(
    frame.now,
    first.t,
    last.t,
    left,
    Math.max(left + 40, right),
  );

  drawVerticalLine(
    context,
    nowX,
    top,
    bottom,
    palette.text2,
    [],
    0.36,
  );

  const revealRight =
    left +
    (Math.max(left + 40, right) - left) *
      clamp(frame.reveal, 0, 1);

  context.save();
  context.beginPath();
  context.rect(
    left,
    top - 8,
    Math.max(0, revealRight - left),
    bottom - top + 16,
  );
  context.clip();

  drawRibbon(
    context,
    points,
    x,
    passY,
    failY,
    palette,
  );
  drawStepLine(
    context,
    points,
    x,
    passY,
    palette.pass,
    [],
    2,
  );
  drawStepLine(
    context,
    points,
    x,
    failY,
    palette.fail,
    [6, 4],
    2,
  );

  context.restore();

  const labelInside = width < 400;
  const labels: ChartLabel[] = [
    ...threadLabels(
      labelInside ? right - 8 : right + 8,
      passY(last),
      failY(last),
      displayValue(last, 'yes', frame.separation),
      displayValue(last, 'no', frame.separation),
      palette.passText,
      palette.failText,
      {
        align: labelInside ? 'right' : 'left',
        minimumSeparation: 20,
        pill: true,
      },
    ),
    {
      x: clamp(nowX + 8, left + 8, right - 24),
      y: top + 8,
      text: 'Now',
      color: palette.text2,
      avoidThreads: false,
      pill: true,
    },
  ];

  drawLabels(
    context,
    width,
    height,
    labels,
    palette.card,
    [
      points.map(point => ({
        x: x(point),
        y: passY(point),
      })),
      points.map(point => ({
        x: x(point),
        y: failY(point),
      })),
    ],
  );

  const current = projectPoint(currentRaw, currentRaw, frame.series);
  const geometry = pulseGeometry(
    frame.series,
    currentRaw,
    nowX,
    passY(current),
    failY(current),
    -100,
    bottom,
    right,
    palette,
  );

  return {
    ...geometry,
    plotLeft: left,
    plotRight: right,
    priceTop: top,
    priceBottom: bottom,
    gapTop: bottom,
    gapBottom: bottom,
  };
}

export function drawFork(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: ChartFrame,
): ForkGeometry | undefined {
  if (width <= 0 || height <= 0) return undefined;

  const palette = chartPalette(context, frame);

  context.clearRect(0, 0, width, height);
  context.canvas.__labels = [];

  if (frame.mode === 'detail') {
    return drawDetail(
      context,
      width,
      height,
      frame,
      palette,
    );
  }

  return drawBoard(
    context,
    width,
    height,
    frame,
    palette,
  );
}
