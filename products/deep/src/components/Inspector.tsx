import type { Market } from '../data/types';
import { price, signed } from '../data/markets';
import { series } from '../data/series';
export function Inspector({ market: m }: { market: Market }) {
  const points = series[m.id].up; const first = points[0].value;
  return <><h2>{m.name}</h2><dl><dt>UP · original work</dt><dd>{price(m.up)}</dd><dt>UP on Oct 1</dt><dd>{price(first)} <span className={m.up >= first ? 'gain' : 'loss'}>{signed(m.up - first)}</span></dd><dt>DOWN · dependencies</dt><dd>{price(m.down)}</dd><dt>Unpriced 1 − (UP + DOWN)</dt><dd>{signed(m.residual)}</dd><dt>UP range Oct 1–18</dt><dd>{price(Math.min(...points.map(p => p.value)))}–{price(Math.max(...points.map(p => p.value)))}</dd><dt>Price changes</dt><dd>{points.length - 1}</dd><dt>Volume · tokens</dt><dd>{m.volTok.toFixed(4)}</dd><dt>Liquidity · tokens</dt><dd>{m.liqTok.toFixed(4)}</dd></dl></>;
}
