import { useState } from 'react';
import { Menu } from './Menu';
import { markets, signed } from '../data/markets';
import type { Market } from '../data/types';
import { series } from '../data/series';
import { rank0 } from '../data/envelope';
import { updateQuery } from '../router';
import { Icon } from './Icon';

function Sparkline({ market }:{ market:Market }) {
  const points = series[market.id].up;
  const low = Math.min(...points.map(point => point.value)), high = Math.max(...points.map(point => point.value));
  const x = (index:number) => 2 + index / Math.max(1, points.length - 1) * 68;
  const y = (value:number) => 22 - (value - low) / Math.max(.0001, high - low) * 18;
  return <svg className="row-sparkline" viewBox="0 0 72 24" aria-hidden="true"><path pathLength="1" d={points.map((point, index) => `${index ? 'L' : 'M'}${x(index)} ${y(point.value)}`).join(' ')}/><circle cx={x(points.length - 1)} cy={y(points.at(-1)?.value ?? market.up)} r="1.8"/></svg>;
}

function RepoAvatar({ market }:{ market:Market }) {
  const seed = [...market.name].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return <svg className="repo-avatar" viewBox="0 0 28 28" aria-hidden="true"><rect x="1" y="1" width="26" height="26" rx="8"/><path d={`M7 ${8 + seed % 5}h14M7 14h${8 + seed % 8}M7 ${19 + seed % 3}h11`}/></svg>;
}

export function SplitList({ onCompare, rows, params, predictions, select, trade }:{ onCompare:()=>void; rows:Market[]; params:URLSearchParams; predictions:Record<string,number>; select:(market:Market)=>void; trade:(market:Market)=>void }) {
  const [positions, setPositions] = useState(false), [help, setHelp] = useState('');
  const q = params.get('q') ?? '', sort = params.get('sort') ?? 'up';
  const filtered = rows.filter(market => market.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === '-name' ? b.name.localeCompare(a.name) : sort === 'diff' ? Math.abs((predictions[b.id] ?? b.up) - b.up) - Math.abs((predictions[a.id] ?? a.up) - a.up) : sort === 'change' ? (b.up - series[b.id].up[0].value) - (a.up - series[a.id].up[0].value) : b.up - a.up);
  const rankNow = Object.fromEntries([...rows].sort((a,b) => b.up - a.up || a.name.localeCompare(b.name)).map((market, index) => [market.id, index + 1]));
  return <section data-testid="split-table" className={`repository-box ${positions ? 'positions-view' : ''}`}>
    <div className="list-tools"><div className="list-title"><h2>Repositories</h2><span>{filtered.length} ranked signals</span></div>
      <button onClick={onCompare} data-testid="sideways-compare"><Icon name="compare"/>Compare</button>
      <input data-testid="search-outcomes" aria-label="Search outcomes" placeholder="Search repositories" value={q} onChange={event => updateQuery({ q:event.target.value || null }, true)}/>
      <Menu testId="positions-menu" label={positions ? 'Positions' : 'Market'}>{close => <>{['Market','Positions'].map(value => <button role="menuitem" aria-checked={positions === (value === 'Positions')} key={value} onClick={() => { setPositions(value === 'Positions'); close(); }}>{value}</button>)}</>}</Menu>
      <Menu label="Sort">{close => <>{[['up','UP price'],['name','Repository A–Z'],['-name','Repository Z–A'],['change','Change since Oct 1'],['diff','Difference']].map(([value,label]) => <button role="menuitem" aria-checked={sort === value} key={value} onClick={() => { updateQuery({ sort:value }); close(); }}>{label}</button>)}</>}</Menu>
    </div>
    {help && <div data-testid="help-popover" className="position-help" role="status">{help}<button onClick={() => setHelp('')}>Close</button></div>}
    <div className="repository-grid">
      <div className="list-columns"><span>#</span><button data-testid="sort-name" aria-sort={sort === 'name' ? 'ascending' : sort === '-name' ? 'descending' : 'none'} onClick={() => updateQuery({ sort:sort === 'name' ? '-name' : 'name' })}>Repository</button><span>{positions ? 'Predicted' : 'UP / DOWN signal'}</span><button data-testid="sort-market" disabled={sort === 'up'} title={sort === 'up' ? 'Already sorted by UP price' : undefined} aria-sort={sort === 'up' ? 'descending' : 'none'} onClick={() => updateQuery({ sort:'up' })}>UP</button>{positions ? <><button data-testid="help-up" aria-label="UP ?" onClick={() => setHelp('UP difference = predicted − UP market price')}>Δ UP ?</button><button data-testid="help-down" onClick={() => setHelp('DOWN difference = 1 − predicted − DOWN market price')}>DOWN ?</button><button data-testid="sort-difference" disabled={sort === 'diff'} title={sort === 'diff' ? 'Already sorted by difference' : undefined} onClick={() => updateQuery({ sort:'diff' })}>Difference</button></> : <><button disabled={sort === 'change'} title={sort === 'change' ? 'Already sorted by change' : undefined} onClick={() => updateQuery({ sort:'change' })}>Δ Oct 1</button><span>History</span></>}<span>Action</span></div>
      <div data-testid="split-table-scroll" className="repository-scroll" onMouseLeave={() => updateQuery({ iso:null }, true)}>
        {filtered.map((market, rowIndex) => {
          const movement = rank0[market.id] - rankNow[market.id];
          return <div className="repository-row-wrap" key={market.id} style={{ animationDelay: `${Math.min(rowIndex, 11) * 35}ms` }}>
            <button data-testid="split-row" data-repo={market.name} data-id={market.id} data-hatch={market.residual < 0 ? 'over' : 'gap'} aria-label={`${market.name}, UP ${market.up.toFixed(4)}, DOWN ${market.down.toFixed(4)}`} aria-description={`Independent prices. ${market.residual < 0 ? 'Overlap' : 'Unpriced gap'} ${Math.abs(market.residual).toFixed(4)}. Click for Repository desk, Enter for full detail.`} className="repository-row"
              onDoubleClick={() => { location.hash = `#/repo/${market.name}`; }}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); location.hash = `#/repo/${market.name}`; } if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const next = event.key === 'ArrowDown' ? event.currentTarget.parentElement?.nextElementSibling?.querySelector('button') : event.currentTarget.parentElement?.previousElementSibling?.querySelector('button'); (next as HTMLElement | null)?.focus(); } }}
              onMouseEnter={() => updateQuery({ iso:market.id }, true)} onFocus={() => { updateQuery({ iso:market.id }, true); }} onClick={() => select(market)}>
              <span className="rank-cell"><b>{markets.findIndex(item => item.id === market.id) + 1}</b><i className={movement < 0 ? 'loss' : movement > 0 ? 'gain' : ''}>{movement === 0 ? '—' : `${movement > 0 ? '+' : '−'}${Math.abs(movement)}`}</i></span>
              <span data-testid="col-repository" data-col="repository" className="repository-name" title={market.name}><RepoAvatar market={market}/><span><small>{market.owner}/</small>{market.repo}</span></span>
              {positions ? <span data-testid="col-predicted" data-col="predicted">{predictions[market.id]?.toFixed(4) ?? '—'}</span> : <span className="pair-cell"><span className="bar" aria-hidden="true"><i className="up" style={{ width:`${market.up * 100}%` }}/><i className="down" style={{ width:`${market.down * 100}%` }}/><i className={market.residual < 0 ? 'over hatch' : 'gap hatch'} style={{ left:`${Math.min(market.up, 1 - market.down) * 100}%`, width:`${Math.abs(market.residual) * 100}%` }}/></span><small>{market.down.toFixed(4)} DOWN</small></span>}
              <span data-testid="up-market" data-col="up" className="price-cell">{market.up.toFixed(4)}</span>
              {positions ? <><span data-testid="up-diff">{predictions[market.id] === undefined ? '—' : (predictions[market.id] - market.up).toFixed(4)}</span><span data-testid="down-market">{market.down.toFixed(4)}</span><span data-testid="down-diff">{predictions[market.id] === undefined ? '—' : (1 - predictions[market.id] - market.down).toFixed(4)}</span></> : <><span className={market.up < series[market.id].up[0].value ? 'loss' : 'gain'}>{signed(market.up - series[market.id].up[0].value).slice(0, -1)}</span><span><Sparkline market={market}/></span></>}
            </button>
            <button className="row-trade secondary" aria-label={`Trade ${market.name}`} onClick={() => trade(market)}>Trade<Icon name="arrow" size={15}/></button>
          </div>;
        })}
        {!filtered.length && <div className="empty"><span>No repositories match</span><button onClick={() => updateQuery({ q:null })}>Clear search</button></div>}
      </div>
    </div>
    
  </section>;
}
