export interface LabelRect {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  lineDash: number[];
  glyphLineDash?: number[];
  threadYRanges: { min: number; max: number }[];
}

export interface ChartLabel {
  x: number;
  y: number;
  text: string;
  color: string;
  align?: CanvasTextAlign;
  side?: 'above' | 'below';
  avoidThreads?: boolean;
  pill?: boolean;
  kind?: 'pass' | 'fail';
}

export interface ThreadLabelOptions {
  align?: CanvasTextAlign;
  minimumSeparation?: number;
  pill?: boolean;
}

declare global {
  interface HTMLCanvasElement {
    __labels?: LabelRect[];
  }
}

const minimumLabelSeparation = 20;
const horizontalPadding = 8;
const verticalPadding = 4;
const textLineHeight = 16;
const glyphWidth = 20;

/** Greedy nearest-position packing with compact chart labels. */
export function drawLabels(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  labels: ChartLabel[],
  backing: string,
  threads: { x: number; y: number }[][] = [],
) {
  const placed: LabelRect[] = [];
  const root =
    context.canvas.closest<HTMLElement>('.ch-root') ??
    document.documentElement;
  const styles = getComputedStyle(root);
  const font =
    styles.getPropertyValue('--font-ui').trim() ||
    '"Inter Tight", "Arial Narrow", Arial, sans-serif';

  context.save();
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.setLineDash([]);
  context.lineJoin = 'round';
  context.font = `600 11px ${font}`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';

  for (const label of labels) {
    const pillPadding = label.pill ? horizontalPadding : 0;
    const glyphSpace = label.kind ? glyphWidth : 0;
    const maxTextWidth = Math.max(
      8,
      width - 24 - pillPadding * 2 - glyphSpace,
    );
    let text = label.text;

    while (
      context.measureText(text).width > maxTextWidth &&
      text.length > 1
    ) {
      text = `${text.slice(0, -2)}…`;
    }

    const textWidth = context.measureText(text).width;
    const rectWidth =
      textWidth + glyphSpace + pillPadding * 2;
    const rectHeight = label.pill
      ? textLineHeight + verticalPadding * 2
      : textLineHeight;

    const desiredRectX =
      label.align === 'right'
        ? label.x - rectWidth
        : label.align === 'center'
          ? label.x - rectWidth / 2
          : label.x;

    const rectX = Math.max(
      8,
      Math.min(width - 8 - rectWidth, desiredRectX),
    );

    const threadYRanges =
      label.avoidThreads === false
        ? []
        : threads.flatMap(points => {
            const values: number[] = [];

            for (
              let position = 1;
              position < points.length;
              position += 1
            ) {
              const previous = points[position - 1];
              const current = points[position];

              if (!previous || !current) continue;
              if (
                current.x < rectX - 2 ||
                previous.x > rectX + rectWidth + 2
              ) {
                continue;
              }

              values.push(previous.y, current.y);
            }

            return values.length
              ? [
                  {
                    min: Math.min(...values),
                    max: Math.max(...values),
                  },
                ]
              : [];
          });

    const minimumCenter = Math.max(
      16,
      rectHeight / 2 + 8,
    );
    const maximumCenter = Math.max(
      minimumCenter,
      height - minimumCenter,
    );
    const preferred = Math.max(
      minimumCenter,
      Math.min(maximumCenter, label.y),
    );
    let labelY: number | undefined;

    for (let offset = 0; offset <= height; offset += 1) {
      const candidates = offset
        ? [preferred + offset, preferred - offset]
        : [preferred];

      for (const candidate of candidates) {
        if (
          candidate < minimumCenter ||
          candidate > maximumCenter
        ) {
          continue;
        }
        if (
          label.side === 'above' &&
          candidate > preferred
        ) {
          continue;
        }
        if (
          label.side === 'below' &&
          candidate < preferred
        ) {
          continue;
        }

        if (
          threadYRanges.some(
            range =>
              candidate + rectHeight / 2 + 8 > range.min &&
              candidate - rectHeight / 2 - 8 < range.max,
          )
        ) {
          continue;
        }

        const clear = placed.every(rect => {
          const horizontallySeparated =
            rectX + rectWidth + 8 <= rect.x ||
            rectX >= rect.x + rect.w + 8;
          const centersSeparated =
            Math.abs(candidate - (rect.y + rect.h / 2)) >=
            Math.max(
              minimumLabelSeparation,
              (rectHeight + rect.h) / 2 + 4,
            );

          return horizontallySeparated || centersSeparated;
        });

        if (clear) {
          labelY = candidate;
          break;
        }
      }

      if (labelY !== undefined) break;
    }

    if (labelY === undefined) continue;

    if (label.pill) {
      context.fillStyle = backing;
      context.beginPath();
      context.roundRect(
        rectX,
        labelY - rectHeight / 2,
        rectWidth,
        rectHeight,
        8,
      );
      context.fill();
    } else {
      context.strokeStyle = backing;
      context.lineWidth = 4;
      context.strokeText(
        text,
        rectX + glyphSpace,
        labelY,
      );
    }

    let textX = rectX + pillPadding;

    if (label.kind) {
      context.save();
      context.strokeStyle = label.color;
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.setLineDash(
        label.kind === 'fail' ? [6, 4] : [],
      );
      context.beginPath();
      context.moveTo(textX, labelY);
      context.lineTo(textX + 16, labelY);
      context.stroke();
      context.restore();
      textX += glyphWidth;
    }

    context.fillStyle = label.color;
    context.fillText(text, textX, labelY);

    placed.push({
      x: rectX,
      y: labelY - rectHeight / 2,
      w: rectWidth,
      h: rectHeight,
      text,
      // Halo strokes are solid; only the FAIL glyph has a dashed line.
      lineDash: context.getLineDash(),
      glyphLineDash: label.kind === 'fail' ? [6, 4] : [],
      threadYRanges,
    });
  }

  context.restore();
  context.canvas.__labels = placed;
}

export function threadLabels(
  x: number,
  yesY: number,
  noY: number,
  yes: number,
  no: number,
  pass: string,
  fail: string,
  options: ThreadLabelOptions = {},
): ChartLabel[] {
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const passAbove = yesY <= noY;
  const separation = Math.abs(yesY - noY);
  const requiredSeparation =
    options.minimumSeparation ?? minimumLabelSeparation;
  const nudge = Math.max(
    0,
    (requiredSeparation - separation) / 2,
  );
  const passLabelY = yesY + (passAbove ? -nudge : nudge);
  const failLabelY = noY + (passAbove ? nudge : -nudge);

  return [
    {
      x,
      y: passLabelY,
      text: `PASS ${formatter.format(yes)}`,
      color: pass,
      align: options.align ?? 'right',
      avoidThreads: true,
      pill: options.pill ?? true,
      kind: 'pass',
    },
    {
      x,
      y: failLabelY,
      text: `FAIL ${formatter.format(no)}`,
      color: fail,
      align: options.align ?? 'right',
      avoidThreads: true,
      pill: options.pill ?? true,
      kind: 'fail',
    },
  ];
}
