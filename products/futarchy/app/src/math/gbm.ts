/** Exact GBM: S' = S exp((mu - sigma²/2)dt + sigma sqrt(dt)z); dt in years. */
export function step(S: number, mu: number, sigma: number, dt: number, z: number): number {
  return S * Math.exp((mu - sigma * sigma / 2) * dt + sigma * Math.sqrt(dt) * z);
}
