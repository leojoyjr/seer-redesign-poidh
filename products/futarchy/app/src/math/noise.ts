import { mulberry32 } from './rng';
/** Seeded 2D simplex: skew into triangular cells, sum compact radial gradient kernels. */
export function simplex2D(seed: number): (x: number, y: number) => number {
  const random = mulberry32(seed), permutation = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [permutation[i], permutation[j]] = [permutation[j], permutation[i]]; }
  const p = [...permutation, ...permutation], f = (Math.sqrt(3) - 1) / 2, g = (3 - Math.sqrt(3)) / 6;
  const gradients = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  return (x, y) => {
    const skew = (x + y) * f, i = Math.floor(x + skew), j = Math.floor(y + skew), unskew = (i + j) * g;
    const x0 = x - i + unskew, y0 = y - j + unskew, a = x0 > y0 ? 1 : 0, b = 1 - a;
    const corner = (dx: number, dy: number, di: number, dj: number) => {
      const radius = .5 - dx * dx - dy * dy;
      if (radius <= 0) return 0;
      const gradient = gradients[p[(i + di + p[(j + dj) & 255]) & 255] % 8];
      return radius ** 4 * (gradient[0] * dx + gradient[1] * dy);
    };
    return 70 * (corner(x0, y0, 0, 0) + corner(x0 - a + g, y0 - b + g, a, b) + corner(x0 - 1 + 2 * g, y0 - 1 + 2 * g, 1, 1));
  };
}
