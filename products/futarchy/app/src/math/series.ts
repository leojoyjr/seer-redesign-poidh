import { step as gbm } from './gbm';
import { step as ou } from './ou';
import { mulberry32, normal } from './rng';

export const presets = [0.006, 0.018, -0.016] as const;
export interface SeriesParams {
  t0: number; fork: number; now: number; T: number; dt: number;
  spot: number; sigma: number; mu: number; kappa: number; theta: number; eta: number;
}
export interface SeriesPoint { t: number; spot: number; g: number; yes: number; no: number; impact: number }
export interface Series {
  params: SeriesParams; points: SeriesPoint[]; times: number[]; spot: number[];
  gap: number[]; yes: number[]; no: number[]; nowIndex: number; forkIndex: number;
}
export const defaultParams: SeriesParams = {
  t0: -14, fork: -8, now: 0, T: 6.62, dt: 1 / 12,
  spot: 2432.83, sigma: 0.55, mu: 0, kappa: 3, theta: presets[0], eta: 0.004,
};
/** Daily timeline; annualised GBM uses dt/365. Scale spot to S(now),
 * and condition OU history on g(now)=theta with its exponential covariance bridge. */
export function buildSeries(seed: number, overrides: Partial<SeriesParams> = {}): Series {
  const params = { ...defaultParams, ...overrides };
  const { t0, fork, now, T, dt, kappa, theta, eta } = params;
  if (!(dt > 0 && t0 <= fork && fork < now && now <= T && kappa > 0)) {
    throw new RangeError('Invalid series timeline or mean reversion');
  }
  const z = normal(mulberry32(seed));
  const times = Array.from(new Set([
    ...Array.from({ length: Math.floor((T - t0) / dt) + 1 }, (_, i) => t0 + i * dt), fork, now, T,
  ])).sort((a, b) => a - b).filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-10);
  const nowIndex = times.findIndex(t => Math.abs(t - now) < 1e-10);
  const forkIndex = times.findIndex(t => Math.abs(t - fork) < 1e-10);
  const spot = [params.spot];
  const gap = [0];
  for (let i = 1; i < times.length; i++) {
    const elapsed = times[i] - times[i - 1];
    spot.push(gbm(spot[i - 1], params.mu, params.sigma, elapsed / 365, z()));
    gap.push(times[i] < fork ? 0 : ou(gap[i - 1], kappa, theta, eta, elapsed, z()));
  }
  const scale = params.spot / spot[nowIndex];
  const observedGap = gap[nowIndex] - theta;
  for (let i = 0; i < times.length; i++) {
    spot[i] *= scale;
    if (i >= forkIndex) gap[i] -= observedGap * Math.exp(-kappa * Math.abs(times[i] - now));
  }
  gap[forkIndex] = 0;
  gap[nowIndex] = theta;
  const points = times.map((t, i) => {
    const yes = spot[i] * (1 + gap[i] / 2);
    const no = spot[i] * (1 - gap[i] / 2);
    return { t, spot: spot[i], g: gap[i], yes, no, impact: (yes - no) / no };
  });
  return { params, points, times, spot, gap, yes: points.map(p => p.yes), no: points.map(p => p.no), nowIndex, forkIndex };
}
