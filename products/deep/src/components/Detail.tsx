import { useEffect } from 'react';
import type { Market, Step } from '../data/types';
import { END, START, series } from '../data/series';
import { Inspector } from './Inspector';
function path(points: Step[], min: number, max: number) { const x = (t: number) => 40 + (t - START) / (END - START) * 880; const y = (v: number) => 300 - (v - min) / (max - min) * 260; return points.map((p, i) => `${i ? `H${x(p.t)}V` : `M${x(p.t)},`}${y(p.value)}`).join(' ') + `H${x(END)}`; }
export function Detail({ market }: { market: Market }) {
  useEffect(() => { const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') location.hash = '#/'; }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape); }, []);
  const data = series[market.id]; const values = [...data.up, ...data.down].map(p => p.value); const min = Math.min(...values) - .04; const max = Math.max(...values) + .04;
  return <section data-testid="repo-detail" className="detail card" data-align><a className="back" href="#/" aria-label="Back to markets">← All deep markets / {market.name}</a><Inspector market={market} /><h2>Share of original work over time</h2><div className="legend"><span className="up-key">UP</span><span className="down-key">DOWN</span></div><svg viewBox="0 0 960 340" role="img" aria-label={`${market.name} UP and DOWN step prices, Oct 1–18, 2026`}><path className="chart-up" d={path(data.up, min, max)} /><path className="chart-down" d={path(data.down, min, max)} />{[0, .25, .5, .75, 1].map(p => <text key={p} x="4" y={300 - p * 260}>{(min + p * (max - min)).toFixed(2)}</text>)}<text x="40" y="332">Oct 1, 2026</text><text x="920" y="332" textAnchor="end">Oct 18, 2026</text></svg></section>;
}
