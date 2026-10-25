/** Exact OU step; kappa is per day, dt is days. kappa=0 is Brownian motion. */
export function step(g: number, kappa: number, theta: number, eta: number, dt: number, z: number): number {
  const decay = Math.exp(-kappa * dt);
  const variance = kappa === 0 ? dt : -Math.expm1(-2 * kappa * dt) / (2 * kappa);
  return theta + (g - theta) * decay + eta * Math.sqrt(variance) * z;
}
/** Stationary variance s² = eta²/(2 kappa). */
export function stationaryVariance(kappa: number, eta: number): number {
  return eta * eta / (2 * kappa);
}
/** E[g(t)|g(now)] = theta + (g(now)-theta) exp(-kappa(t-now)). */
export function expectation(g: number, kappa: number, theta: number, elapsed: number): number {
  return theta + (g - theta) * Math.exp(-kappa * elapsed);
}
