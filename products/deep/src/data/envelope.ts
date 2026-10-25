import { markets } from './markets';
import { START, END, series, valueAt } from './series';
function quantile(values: number[], p: number) { const x = (values.length - 1) * p; const lo = Math.floor(x); return values[lo] + (values[Math.ceil(x)] - values[lo]) * (x - lo); }
export const envelope = Array.from({ length: Math.floor((END - START) / 5400) + 1 }, (_, i) => {
  const t = START + i * 5400; const values = markets.map(m => valueAt(series[m.id].up, t)).sort((a, b) => a - b);
  return { t, p10: quantile(values, .1), p50: quantile(values, .5), p90: quantile(values, .9) };
});
export const dip = envelope.reduce((a, b) => b.p50 < a.p50 ? b : a);
export const rank0 = Object.fromEntries([...markets].sort((a, b) => series[b.id].up[0].value - series[a.id].up[0].value || a.name.localeCompare(b.name)).map((m, i) => [m.id, i + 1]));
export const currentRank = Object.fromEntries(markets.map((m, i) => [m.id, i + 1]));
