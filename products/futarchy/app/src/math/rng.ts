import { randomNormal } from 'd3-random';

/** Mulberry32: unsigned 32-bit state maps deterministically to [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
export function normal(rng: () => number, mean = 0, deviation = 1): () => number {
  return randomNormal.source(rng)(mean, deviation);
}
