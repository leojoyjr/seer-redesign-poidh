import { stationaryVariance } from './ou';
import type { SeriesPoint } from './series';

export type Verdict = 'Include' | 'Neutral' | 'Exclude';
export function verdict(x: number): Verdict {
  return x > 0.01 ? 'Include' : x < -0.01 ? 'Exclude' : 'Neutral';
}
function gapAt(points: readonly SeriesPoint[], t: number): number {
  if (!points.length) throw new RangeError('TWAP requires observations');
  if (t <= points[0].t) return points[0].g;
  for (let i = 1; i < points.length; i++) {
    if (points[i].t >= t) {
      const a = points[i - 1], b = points[i];
      return a.g + (b.g - a.g) * (t - a.t) / (b.t - a.t);
    }
  }
  return points[points.length - 1].g;
}
/** (1/5) integral_[T-5,T] g: trapezoidal realised samples plus analytic OU expectation. */
export function twapGap(points: readonly SeriesPoint[], now: number, T: number, kappa = 3, theta = 0.0004): number {
  const start = T - 5;
  const end = Math.min(now, T);
  let integral = 0;
  if (end > start) {
    const knots = [start, ...points.filter(p => p.t > start && p.t < end).map(p => p.t), end];
    for (let i = 1; i < knots.length; i++) {
      integral += (gapAt(points, knots[i - 1]) + gapAt(points, knots[i])) * (knots[i] - knots[i - 1]) / 2;
    }
  }
  if (now < T) {
    const a = Math.max(start, now) - now, b = T - now;
    const decayIntegral = kappa === 0 ? b - a : (Math.exp(-kappa * a) - Math.exp(-kappa * b)) / kappa;
    integral += theta * (b - a) + (gapAt(points, now) - theta) * decayIntegral;
  }
  return integral / 5;
}
/** Var_rem = 2s²/kappa² (kappa L - (1-exp(-kappa L))); final mean variance /25. */
export function twapVariance(now: number, T: number, kappa = 3, eta = 0.004): number {
  const L = Math.max(0, T - Math.max(now, T - 5));
  const s2 = stationaryVariance(kappa, eta);
  return Math.max(0, 2 * s2 / (kappa * kappa) * (kappa * L + Math.expm1(-kappa * L))) / 25;
}
export function twapCone(estimate: number, now: number, T: number, kappa = 3, eta = 0.004) {
  const radius = 1.5 * Math.sqrt(twapVariance(now, T, kappa, eta));
  return { lower: estimate - radius, upper: estimate + radius, radius };
}
