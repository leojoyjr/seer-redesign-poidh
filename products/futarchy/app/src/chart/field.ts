import { expectation } from '../math/ou';
import { simplex2D } from '../math/noise';
import { mulberry32 } from '../math/rng';
import type { Series } from '../math/series';
import { twapGap, verdict } from '../math/twap';

interface Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  world: 1 | -1;
  phase: number;
}

export interface FieldPointer {
  x: number;
  y: number;
  active: boolean;
}

interface FieldPalette {
  background: string;
  pass: string;
  fail: string;
  gap: string;
  text: string;
  text2: string;
  text3: string;
  line: string;
  font: string;
}

function fieldPalette(
  context: CanvasRenderingContext2D,
): FieldPalette {
  const root =
    context.canvas.closest<HTMLElement>('.ch-root') ??
    document.documentElement;
  const styles = getComputedStyle(root);
  const textFallback = styles.color || 'CanvasText';
  const cardFallback =
    styles.backgroundColor || 'Canvas';

  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  const card = read('--card', cardFallback);
  const text = read('--text', textFallback);

  return {
    background: read('--nested', card),
    pass: read('--pass', text),
    fail: read('--fail', text),
    gap: read('--gap', text),
    text,
    text2: read('--text-2', text),
    text3: read('--text-3', text),
    line: read('--line', text),
    font:
      read('--font-ui', '') ||
      '"Inter Tight", "Arial Narrow", Arial, sans-serif',
  };
}

/** Fixed-size pool with position Verlet integration. */
export class Field {
  private random = mulberry32(8363);
  private noise = simplex2D(8363);
  private particles: Particle[] = Array.from(
    { length: 480 },
    (_, position) => ({
      x: this.random(),
      y: this.random(),
      px: 0,
      py: 0,
      world: position < 240 ? 1 : -1,
      phase: this.random() * Math.PI * 2,
    }),
  );
  private accumulator = 0;
  private elapsed = 0;
  private model = '';

  clear() {
    this.accumulator = 0;
    this.elapsed = 0;
    this.model = '';

    for (const particle of this.particles) {
      particle.px = particle.x;
      particle.py = particle.y;
    }
  }

  draw(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    series: Series,
    now: number,
    delta: number,
    reduced: boolean,
    pointer: FieldPointer,
  ) {
    if (width <= 0 || height <= 0) return;

    const palette = fieldPalette(context);

    context.save();
    context.clearRect(0, 0, width, height);
    context.fillStyle = palette.background;
    context.fillRect(0, 0, width, height);

    const current = series.points.reduce<
      (typeof series.points)[number] | null
    >((closest, candidate) => {
      if (!closest) return candidate;
      return Math.abs(candidate.t - now) <
        Math.abs(closest.t - now)
        ? candidate
        : closest;
    }, null);

    if (!current) {
      context.restore();
      return;
    }

    const left = Math.max(40, width * 0.08);
    const right = Math.max(left + 64, width * 0.9);
    const top = 32;
    const bottom = Math.max(top + 64, height - 32);
    const usableHeight = bottom - top;

    const expectedGap = (progress: number) =>
      expectation(
        current.g,
        series.params.kappa,
        series.params.theta,
        Math.max(0, series.params.T - now) * progress,
      );

    const amplitude = (value: number) =>
      Math.max(-1, Math.min(1, value / 0.03)) *
      usableHeight *
      0.32;

    const streamCenter = (
      progress: number,
      world: 1 | -1,
    ) =>
      height / 2 -
      world * amplitude(expectedGap(progress)) / 2;

    const neutralBand = Math.max(
      24,
      Math.abs(amplitude(0.01)),
    );
    const currentVerdict = verdict(
      twapGap(
        series.points,
        now,
        series.params.T,
        series.params.kappa,
        series.params.theta,
      ),
    );

    const model = [
      width,
      height,
      series.params.theta,
      now.toFixed(4),
    ].join(':');

    if (model !== this.model) {
      this.model = model;
      this.accumulator = 0;

      for (const particle of this.particles) {
        const progress = this.random();
        particle.x = left + progress * (right - left);
        particle.y =
          streamCenter(progress, particle.world) +
          (this.random() - 0.5) * 32;
        particle.px = particle.x - 1;
        particle.py = particle.y;
      }
    }

    context.save();
    context.strokeStyle = palette.line;
    context.lineWidth = 1;
    context.globalAlpha = 0.75;

    for (let position = 1; position < 4; position += 1) {
      const y = top + (usableHeight * position) / 4;
      context.beginPath();
      context.moveTo(left, Math.floor(y) + 0.5);
      context.lineTo(right, Math.floor(y) + 0.5);
      context.stroke();
    }

    for (let position = 1; position < 5; position += 1) {
      const x = left + ((right - left) * position) / 5;
      context.beginPath();
      context.moveTo(Math.floor(x) + 0.5, top);
      context.lineTo(Math.floor(x) + 0.5, bottom);
      context.stroke();
    }

    context.restore();

    context.save();
    context.beginPath();

    for (let position = 0; position <= 64; position += 1) {
      const progress = position / 64;
      const x = left + progress * (right - left);
      const y = streamCenter(progress, 1);

      if (position === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }

    for (let position = 64; position >= 0; position -= 1) {
      const progress = position / 64;
      const x = left + progress * (right - left);
      const y = streamCenter(progress, -1);
      context.lineTo(x, y);
    }

    context.closePath();
    context.globalAlpha = current.impact >= 0 ? 0.24 : 0.12;
    context.fillStyle =
      current.impact >= 0 ? palette.gap : palette.fail;
    context.fill();
    context.restore();

    const drawStream = (
      world: 1 | -1,
      color: string,
      dash: readonly number[],
    ) => {
      context.save();
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.setLineDash([...dash]);
      context.beginPath();

      for (let position = 0; position <= 64; position += 1) {
        const progress = position / 64;
        const x = left + progress * (right - left);
        const y = streamCenter(progress, world);

        if (position === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      context.stroke();
      context.restore();
    };

    drawStream(1, palette.pass, []);
    drawStream(-1, palette.fail, [6, 4]);

    if (!reduced) {
      this.accumulator += Math.min(delta, 0.05);

      while (this.accumulator >= 1 / 60) {
        this.accumulator -= 1 / 60;
        this.elapsed += 1 / 60;

        for (const particle of this.particles) {
          const progress = Math.max(
            0,
            Math.min(
              1,
              (particle.x - left) / Math.max(1, right - left),
            ),
          );
          const targetY = streamCenter(
            progress,
            particle.world,
          );
          const noiseX = particle.x / 96;
          const noiseY =
            particle.y / 96 + this.elapsed * 0.12;
          const curl =
            this.noise(noiseX, noiseY + 0.01) -
            this.noise(noiseX, noiseY - 0.01);

          let accelerationX =
            0.1 +
            progress * 0.08 -
            (particle.x - particle.px) * 0.04;
          let accelerationY =
            (targetY - particle.y) * 0.012 +
            curl * 0.48;

          if (pointer.active) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distance = Math.hypot(dx, dy);

            if (distance < 88) {
              const force =
                (1 - distance / 88) /
                Math.max(1, distance);
              accelerationX += dx * force * 0.72;
              accelerationY += dy * force * 0.72;
            }
          }

          const previousX = particle.x;
          const previousY = particle.y;

          particle.x +=
            (particle.x - particle.px) * 0.94 +
            accelerationX;
          particle.y +=
            (particle.y - particle.py) * 0.94 +
            accelerationY;
          particle.px = previousX;
          particle.py = previousY;
          particle.y = Math.max(
            top,
            Math.min(bottom, particle.y),
          );

          if (particle.x > right) {
            particle.x = left;
            particle.y =
              streamCenter(0, particle.world) +
              (this.random() - 0.5) * 24;
            particle.px = particle.x - 1;
            particle.py = particle.y;
            particle.phase = this.random() * Math.PI * 2;
          }
        }
      }
    }

    for (const particle of this.particles) {
      const progress = Math.max(
        0,
        Math.min(
          1,
          (particle.x - left) / Math.max(1, right - left),
        ),
      );
      const y = reduced
        ? streamCenter(progress, particle.world) +
          this.noise(progress * 12, particle.phase) *
            8 *
            (1 - progress)
        : particle.y;

      context.save();
      context.globalAlpha = 0.56;
      context.fillStyle =
        particle.world === 1 ? palette.pass : palette.fail;
      context.beginPath();
      context.arc(particle.x, y, 1.2, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    const zoneTop = top;
    const zoneBottom = bottom;
    const includeBottom = height / 2 - neutralBand / 2;
    const neutralBottom = height / 2 + neutralBand / 2;

    const zones = [
      {
        label: 'Include',
        top: zoneTop,
        bottom: includeBottom,
        color: palette.pass,
      },
      {
        label: 'Neutral',
        top: includeBottom,
        bottom: neutralBottom,
        color: palette.gap,
      },
      {
        label: 'Exclude',
        top: neutralBottom,
        bottom: zoneBottom,
        color: palette.fail,
      },
    ] as const;

    context.font = `500 11px ${palette.font}`;
    context.textBaseline = 'middle';

    for (const zone of zones) {
      const active = zone.label === currentVerdict;

      context.save();
      context.globalAlpha = active ? 0.36 : 0.08;
      context.fillStyle = zone.color;
      context.fillRect(
        right - 4,
        zone.top,
        8,
        Math.max(0, zone.bottom - zone.top),
      );
      context.restore();

      context.fillStyle = active
        ? palette.text
        : palette.text2;
      context.textAlign = 'right';
      context.fillText(
        zone.label,
        right - 16,
        (zone.top + zone.bottom) / 2,
      );
    }

    context.fillStyle = palette.text3;
    context.textAlign = 'left';
    context.fillText('FIELD VIEW', left, 16);

    context.fillStyle = palette.pass;
    context.fillText('PASS forecast', left, top - 8);

    context.fillStyle = palette.fail;
    context.fillText('FAIL forecast', left, bottom + 16);

    context.fillStyle = palette.text2;
    context.fillText('Now', left, height - 12);

    context.restore();
  }
}
