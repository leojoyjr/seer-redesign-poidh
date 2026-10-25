import { expectation, step as ou } from './ou';
import { step as gbm } from './gbm';
import type { Series, SeriesPoint } from './series';
/** Conditional GBM mean S exp(mu*dt/365); OU conditional gap determines both worlds. */
export function projectPoint(point: SeriesPoint, current: SeriesPoint, series: Series): SeriesPoint {
  if (point.t <= current.t) return point;
  const { mu, kappa, theta } = series.params;
  const spot = current.spot * Math.exp(mu * (point.t - current.t) / 365);
  const g = expectation(current.g, kappa, theta, point.t - current.t);
  const yes = spot * (1 + g / 2), no = spot * (1 - g / 2);
  return { t: point.t, spot, g, yes, no, impact: (yes - no) / no };
}
/** GBM diffusion standard deviation at horizon dt in days. */
export function priceRadius(spot: number, sigma: number, dt: number): number {
  return spot * sigma * Math.sqrt(Math.max(0, dt) / 365);
}
/** Append an observed 2.5-second tick while retaining the seeded future for replay. */
export function appendTick(series: Series, z: () => number): Series {
  const p = series.points[series.nowIndex], dt = 2.5 / 86400;
  const { mu, sigma, kappa, theta, eta } = series.params;
  const spot = gbm(p.spot, mu, sigma, dt / 365, z()), g = ou(p.g, kappa, theta, eta, dt, z());
  const yes = spot * (1 + g / 2), no = spot * (1 - g / 2);
  const point = { t: p.t + dt, spot, g, yes, no, impact: (yes - no) / no };
  const points = [...series.points.filter(v => v.t <= p.t), point, ...series.points.filter(v => v.t > point.t)];
  return { ...series, params: { ...series.params, now: point.t }, points, nowIndex: points.indexOf(point),
    times: points.map(v => v.t), spot: points.map(v => v.spot), gap: points.map(v => v.g), yes: points.map(v => v.yes), no: points.map(v => v.no) };
}
