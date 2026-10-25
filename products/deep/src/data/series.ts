import source from './real/get-market-charts.json';
import type { MarketSeries, Step } from './types';
export const START = 1790859600;
export const END = 1792351800;
// Consecutive identical values are the API's horizontal step endpoints, not trades.
function dedupe(points: number[][]): Step[] { return points.filter((p, i) => i === 0 || p[1] !== points[i - 1][1]).map(([t, value]) => ({ t, value })); }
export const series: Record<string, MarketSeries> = Object.fromEntries(Object.entries(source).map(([id, chart]) => [id.toLowerCase(), {
  up: dedupe(chart.series.find(s => s.outcomeName === 'UP')?.points ?? []),
  down: dedupe(chart.series.find(s => s.outcomeName === 'DOWN')?.points ?? []),
  invalidCount: chart.series.filter(s => s.outcomeName === 'Invalid result').length,
}]));
export function valueAt(points: Step[], t: number): number { let value = points[0]?.value ?? 0; for (const p of points) { if (p.t > t) break; value = p.value; } return value; }
