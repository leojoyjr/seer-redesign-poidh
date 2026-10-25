/** Signal animation uses fixed state and allocates no frame particles. */
export interface PulseGeometry {
  x: number;
  yes: number;
  no: number;
  gapY: number;
  edge: number;
  end: number;
  yesAngle: number;
  noAngle: number;
  yesMomentum: number;
  noMomentum: number;
  gap: number;
  violet: string;
  grey: string;
  dark: boolean;
}

export interface PulseDiagnostics {
  mode: 'moving' | 'waiting';
  particles: number;
}

declare global {
  interface HTMLCanvasElement {
    __pulse?: PulseDiagnostics;
  }
}

const TAU = Math.PI * 2;
const CYCLE_DURATION = 0.48;
const CYCLE_COUNT = 2;
const TOTAL_DURATION = CYCLE_DURATION * CYCLE_COUNT;

export class SignalPulse {
  readonly diagnostics: PulseDiagnostics = {
    mode: 'waiting',
    particles: 0,
  };

  private age = TOTAL_DURATION;
  private yesMomentum = 0;
  private noMomentum = 0;
  private previousGap = 0;

  get active() {
    return this.age < TOTAL_DURATION;
  }

  clear() {
    this.age = TOTAL_DURATION;
    this.diagnostics.particles = 0;
  }

  update(geometry: PulseGeometry, initial: boolean) {
    this.yesMomentum = initial
      ? geometry.yesMomentum
      : this.yesMomentum +
        (geometry.yesMomentum - this.yesMomentum) * (2 / 13);
    this.noMomentum = initial
      ? geometry.noMomentum
      : this.noMomentum +
        (geometry.noMomentum - this.noMomentum) * (2 / 13);

    const previousBand = Math.floor(
      (this.previousGap + 0.01) / 0.02,
    );
    const nextBand = Math.floor(
      (geometry.gap + 0.01) / 0.02,
    );

    if (initial || previousBand !== nextBand) {
      this.age = 0;
    }

    this.previousGap = geometry.gap;
    this.diagnostics.mode =
      Math.max(
        Math.abs(this.yesMomentum),
        Math.abs(this.noMomentum),
      ) >= 0.25
        ? 'moving'
        : 'waiting';
  }

  tick(
    geometry: PulseGeometry,
    reduced: boolean,
    enabled: boolean,
  ) {
    this.previousGap = geometry.gap;

    if (!reduced && enabled) {
      this.age = 0;
    }
  }

  draw(
    context: CanvasRenderingContext2D,
    geometry: PulseGeometry,
    delta: number,
    reduced: boolean,
    enabled: boolean,
  ) {
    context.save();
    context.globalCompositeOperation = 'source-over';
    context.setLineDash([]);

    const points = [
      {
        y: geometry.yes,
        color: geometry.violet,
      },
      {
        y: geometry.no,
        color: geometry.grey,
      },
    ];

    for (const point of points) {
      context.globalAlpha = 1;
      context.fillStyle = point.color;
      context.beginPath();
      context.arc(geometry.x, point.y, 4, 0, TAU);
      context.fill();
    }

    if (reduced || !enabled) {
      this.age = TOTAL_DURATION;
      this.diagnostics.particles = 0;
      context.restore();
      return;
    }

    if (this.age < TOTAL_DURATION) {
      const cycleProgress =
        (this.age % CYCLE_DURATION) / CYCLE_DURATION;
      const eased =
        1 - Math.pow(1 - cycleProgress, 3);

      for (const point of points) {
        context.globalAlpha = 0.24 * (1 - cycleProgress);
        context.strokeStyle = point.color;
        context.lineWidth = 1;
        context.beginPath();
        context.arc(
          geometry.x,
          point.y,
          4 + eased * 4,
          0,
          TAU,
        );
        context.stroke();
      }

      this.age = Math.min(
        TOTAL_DURATION,
        this.age + Math.max(0, delta),
      );
      this.diagnostics.particles = 2;
    } else {
      this.diagnostics.particles = 0;
    }

    context.restore();
  }
}
