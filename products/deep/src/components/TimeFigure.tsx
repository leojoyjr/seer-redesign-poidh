import { Segments } from './Segments';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { line, curveMonotoneX, curveBumpX, area } from 'd3-shape';
import { Icon } from './Icon';
import { updateQuery } from '../router';
import { markets } from '../data/markets';
import { envelope } from '../data/envelope';
import { START, END, series, valueAt } from '../data/series';
import { ReplayStrip, type ReplayControls } from './ReplayStrip';

type Props = {
  controls: ReactNode;
  replay: () => void;
  hidden: boolean;
  toggle: () => void;
  q: string;
  iso: string | null;
  selectedId: string;
  expanded?: boolean;
} & Omit<ReplayControls, 'togglePlay'>;

const downEnvelope = envelope.map(point => {
  const values = markets.map(market => valueAt(series[market.id].down, point.t)).sort((a, b) => a - b);
  const quantile = (q: number) => { const z = (values.length - 1) * q, index = Math.floor(z); return values[index] + (values[Math.ceil(z)] - values[index]) * (z - index); };
  return { t: point.t, p10: quantile(.1), p50: quantile(.5), p90: quantile(.9) };
});
export function TimeFigure({ controls, t, replay, playing, hidden, toggle, q, iso, selectedId, expanded = false, scrub, speed, setSpeed, loop, setLoop }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(820);
  useLayoutEffect(() => { const node=plotRef.current; if(!node)return; const measure=()=>setWidth(Math.max(1,node.getBoundingClientRect().width)); const observer=new ResizeObserver(measure); observer.observe(node); measure(); return ()=>observer.disconnect(); }, []);
  const plotWidth = Math.max(110,width - 64);
  const [chartType,setChartType]=useState<'Lines'|'Rank flow'|'Heatmap'>('Lines');
  const [rowCount,setRowCount]=useState(12);
  const [mode, setMode] = useState<'up'|'down'>('up');
  const [range, setRange] = useState(0);
  const [full, setFull] = useState(false);
  const [asideQ, setAsideQ] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [tip, setTip] = useState<{id:string; time:number; x:number; y:number} | null>(null);
  const baseMarkets = markets.filter(market => market.name.toLowerCase().includes(q.toLowerCase()));
  const envelopeData = mode === 'up' ? envelope : downEnvelope;
  const start = range ? Math.max(START, END - range * 86400) : START;
  const finish = Math.max(start, t);
  const active = hover || iso;
  const flow = useMemo(() => {
    const top = baseMarkets.slice().sort((a,b) => valueAt(series[b.id][mode], finish) - valueAt(series[a.id][mode], finish) || a.name.localeCompare(b.name)).slice(0,chartType === 'Rank flow' ? rowCount : 98);
    const SAMPLES = 28; const times = Array.from({length:SAMPLES},(_,i)=>start+(finish-start)*i/(SAMPLES-1));
    const samples = times.map(time => ({time, order:top.slice().sort((a,b) => valueAt(series[b.id][mode],time)-valueAt(series[a.id][mode],time) || a.name.localeCompare(b.name))}));
    return top.map((market,index) => ({market, rank:index+1, price:valueAt(series[market.id][mode],finish), points:samples.map(s => ({time:s.time, rank:s.order.findIndex(m=>m.id===market.id)+1}))}));
  }, [q,mode,start,finish,chartType,rowCount]);
  const x = (time:number) => 38 + (time-start)/Math.max(1,END-start)*plotWidth;
  const y = (rank:number) => 28+(rank-1)*30;
  const path = line<{time:number;rank:number}>().x(p=>x(p.time)).y(p=>y(p.rank)).curve(curveBumpX);
  const band = envelopeData.filter(p=>p.t>=start && p.t<=finish);
  if (!band.length) band.push(envelopeData.reduce((a,b)=>Math.abs(b.t-finish)<Math.abs(a.t-finish)?b:a));
  const visibleValues = flow.flatMap(({market}) => [
    valueAt(series[market.id][mode], start), valueAt(series[market.id][mode], finish),
    ...series[market.id][mode].filter(p => p.t >= start && p.t <= finish).map(p => p.value),
  ]);
  const dataMin = visibleValues.length ? Math.min(...visibleValues) : 0;
  const dataMax = visibleValues.length ? Math.max(...visibleValues) : 1;
  const padding = Math.max(dataMax - dataMin, .001) * .08;
  const low = full ? 0 : Math.max(0, dataMin - padding);
  const high = full ? 1 : Math.min(1, dataMax + padding);
  const priceY = (v:number) => 340 - (v-low)/Math.max(.000001, high-low)*310;
  const heatColor = (v:number) => {
    const position = Math.max(0, Math.min(1, (v-dataMin)/Math.max(.000001,dataMax-dataMin))) * 5;
    const stop = Math.min(4, Math.floor(position));
    return `color-mix(in srgb, var(--heat-${stop}) ${(1-position+stop)*100}%, var(--heat-${stop+1}))`;
  };
  const miniY = (v:number) => 76-(v-low)/(high-low)*58;
  const medianPath = line<typeof band[number]>().x(p=>x(p.t)).y(p=>miniY(p.p50)).curve(curveMonotoneX);
  const bandPath = area<typeof band[number]>().x(p=>x(p.t)).y0(p=>miniY(p.p10)).y1(p=>miniY(p.p90)).curve(curveMonotoneX);
  const inspect = (id:string, time:number, px=32, py=20) => {setHover(id);setCursor(time);setTip({id,time,x:px,y:py});};
  const clearInspection = () => {setHover(null);setTip(null);setCursor(null);};
  const value = cursor === null ? null : valueAt(series[active || selectedId]?.[mode] ?? [],cursor);
  return <section data-testid="time-figure" className="time-card">
    <div className="rail-heading">
      <div className="chart-title"><h2>Share of original work over time</h2><p>All 98 repositories. Explore prices, rank changes, and the global median.</p></div>
      {controls}
      <div className="chart-controls">
        <div className="segments" aria-label="Chart type">{(['Lines','Rank flow','Heatmap'] as const).map(type=><button key={type} aria-pressed={chartType===type} onClick={()=>setChartType(type)}>{type}</button>)}</div>
        {chartType==='Rank flow' && <div className="segments" aria-label="Rank flow rows">{[12,25,50,98].map(count=><button key={count} aria-pressed={rowCount===count} onClick={()=>setRowCount(count)}>{count===98?'All':`Top ${count}`}</button>)}</div>}
        <Segments values={['up','down'] as const} value={mode} change={setMode} label="Price side" format={v=>v.toUpperCase()}/>
        <Segments values={[1,3,7,0]} value={range} change={setRange} label="Chart range" format={v=>v===0?'All':v===7?'1W':`${v}D`}/>
        <button aria-pressed={!full} aria-current={!full ? 'true' : undefined} title={!full ? 'Current' : undefined} onClick={() => setFull(!full)}>{full ? '0–1' : 'Lens'}</button>
        <button aria-label={playing ? 'Stop replay' : 'Replay market'} onClick={replay}><Icon name={playing ? 'pause' : 'play'} size={16}/>{playing ? 'Stop' : 'Replay'}</button>
        <button data-testid="hide-all" aria-pressed={hidden} onClick={toggle}>{hidden ? 'Show all' : 'Hide all'}</button>
      </div>
    </div>
    <div className="plot-row">
      <div className="time-plot" ref={plotRef}>
        {chartType === 'Rank flow' ? <div className="rank-plot-scroll">        <svg className="rank-flow" preserveAspectRatio="none" overflow="hidden" style={{height: Math.max(390,flow.length*30+44)}} viewBox={`0 0 ${width} ${Math.max(390,flow.length*30+44)}`} role="group" aria-label={`Repository rank flow over time, ranked by ${mode.toUpperCase()} price`}>
          <g className="rank-guides">{Array.from({length:flow.length},(_,i)=><g key={i}><text x="12" y={y(i+1)+4}>{i+1}</text><line x1="34" x2={38+plotWidth} y1={y(i+1)} y2={y(i+1)}/></g>)}</g>
          {!hidden && flow.map(({market,rank,price,points}) => {
            const selected = market.id===selectedId || market.id===active;
            const color = selected ? 'var(--flow-selected)' : `color-mix(in srgb, var(--violet) ${100-(rank-1)*6}%, var(--mist))`;
            return <g key={`${market.id}-${range}-${mode}`} className="flow-ribbon" style={{opacity:active && market.id!==active ? .15 : 1}}>
              {selected && <path d={path(points) ?? ''} fill="none" stroke="var(--surface-1)" strokeWidth={9} strokeLinecap="round"/>}
              <path className="flow-stroke" d={path(points) ?? ''} fill="none" stroke={color} strokeWidth={selected?5.5:2.2+(price-.55)*5} strokeLinecap="round" pathLength="1"/>
              <path d={path(points) ?? ''} fill="none" stroke="transparent" strokeWidth="22" pointerEvents="stroke" tabIndex={0} role="button" aria-label={`${market.name}, rank ${rank}, ${mode.toUpperCase()} ${price.toFixed(4)}`}
                onMouseMove={e=>{const box=e.currentTarget.ownerSVGElement!.getBoundingClientRect();const time=Math.max(start,Math.min(finish,start+((e.clientX-box.left)/box.width*width-38)/plotWidth*(END-start)));inspect(market.id,time,e.clientX-box.left,e.clientY-box.top);}}
                onMouseLeave={clearInspection} onFocus={()=>inspect(market.id,finish)} onBlur={clearInspection}
                data-select-repo={market.id} onClick={()=>updateQuery({iso:market.id},true)}
                onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();updateQuery({iso:market.id},true);}if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();inspect(market.id,Math.max(start,Math.min(finish,(cursor??finish)+(e.key==='ArrowLeft'?-1:1)*(END-start)/100)));}}}/>
            </g>;
          })}
          {cursor !== null && <g className="cursor-rule" pointerEvents="none"><line x1={x(cursor)} x2={x(cursor)} y1="12" y2="360"/><rect x={Math.max(0,Math.min(width-92,x(cursor)-46))} y="348" width="92" height="22" rx="6"/><text x={Math.max(46,Math.min(width-46,x(cursor)))} y="363" textAnchor="middle">{new Date(cursor*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}</text></g>}
          {[0,.25,.5,.75,1].map(f=><text key={f} x={38+f*plotWidth} y={Math.max(382,flow.length*30+30)} textAnchor="middle" fill="var(--muted)">{new Date((start+f*(END-start))*1000).toLocaleDateString('en-GB',{month:'short',day:'numeric',timeZone:'UTC'})}</text>)}
        </svg>
</div> : chartType === 'Heatmap' ? <div className="heatmap-scroll"><div className="heatmap-legend" aria-label={`${mode.toUpperCase()} price scale`}><span>{dataMin.toFixed(4)}</span><i/><span>{dataMax.toFixed(4)}</span></div><div className="heatmap-axis">{[0,.25,.5,.75,1].map(f=><span key={f}>{new Date((start+f*(finish-start))*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>)}</div>{flow.map(({market})=><button className="heatmap-row" key={market.id} aria-label={`${market.name}, ${mode.toUpperCase()} ${valueAt(series[market.id][mode],finish).toFixed(4)}`} data-select-repo={market.id} onClick={()=>updateQuery({iso:market.id},true)} onMouseMove={e=>{const box=plotRef.current!.getBoundingClientRect();inspect(market.id,finish,e.clientX-box.left,e.clientY-box.top);}} onMouseLeave={clearInspection} onFocus={()=>inspect(market.id,finish)} onBlur={clearInspection}>{Array.from({length:40},(_,i)=>{const price=valueAt(series[market.id][mode],start+(finish-start)*i/39);return <span key={i} style={{background:heatColor(price)}}/>;})}</button>)}</div> : <svg className="price-lines" preserveAspectRatio="none" viewBox={`0 0 ${width} 390`} role="group" aria-label={`All 98 repository ${mode.toUpperCase()} prices over time and global median`}>
          <defs><linearGradient id="median-fill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--violet)" stopOpacity=".22"/><stop offset="1" stopColor="var(--violet)" stopOpacity="0"/></linearGradient></defs>
          {[0,.25,.5,.75,1].map(v=><g key={v}><line x1="38" x2={width-26} y1={340-v*310} y2={340-v*310} stroke="var(--hairline)"/><text x="4" y={344-v*310} fill="var(--muted)">{(low+v*(high-low)).toFixed(2)}</text></g>)}
          <path d={area<typeof band[number]>().x(p=>x(p.t)).y0(340).y1(p=>priceY(p.p50)).curve(curveMonotoneX)(band)??''} fill="url(#median-fill)"/>
          {!hidden && flow.map(({market})=>{const points=series[market.id][mode].filter(p=>p.t>=start&&p.t<=finish);points.unshift({t:start,value:valueAt(series[market.id][mode],start)});points.push({t:finish,value:valueAt(series[market.id][mode],finish)});const highlighted=market.id===selectedId || market.id===active;const d=line<typeof points[number]>().x(p=>x(p.t)).y(p=>priceY(p.value)).curve(curveMonotoneX)(points)??'';return <g key={market.id}><path d={d} fill="none" stroke="var(--series-line)" strokeWidth={highlighted?2.5:1} opacity={highlighted?1:active?.04:.12}/><path d={d} fill="none" stroke="transparent" strokeWidth="10" tabIndex={0} role="button" aria-label={market.name} onFocus={()=>inspect(market.id,finish)} onBlur={clearInspection} onMouseMove={e=>{const box=e.currentTarget.ownerSVGElement!.getBoundingClientRect();inspect(market.id,Math.max(start,Math.min(finish,start+(e.clientX-box.left-38)/plotWidth*(END-start))),e.clientX-box.left,e.clientY-box.top);}} onMouseLeave={clearInspection} data-select-repo={market.id} onClick={()=>updateQuery({iso:market.id},true)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();updateQuery({iso:market.id},true);}}}/></g>;})}
          <path d={line<typeof band[number]>().x(p=>x(p.t)).y(p=>priceY(p.p50)).curve(curveMonotoneX)(band)??''} fill="none" stroke="var(--median)" strokeWidth="3" pointerEvents="none"/>
          {cursor!==null && <line x1={x(cursor)} x2={x(cursor)} y1="20" y2="340" stroke="var(--lilac)" strokeDasharray="3 4" pointerEvents="none"/>}
          {[0,.25,.5,.75,1].map(f=><text key={f} x={38+f*plotWidth} y="378" textAnchor="middle" fill="var(--muted)">{new Date((start+f*(END-start))*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</text>)}
        </svg>}
        <span className="selected-chart-tag">{markets.find(m=>m.id===selectedId)?.repo}</span>
        <p data-testid="crosshair-label" className="figure-caption sr-only" aria-live="polite">{new Date((cursor ?? t) * 1000).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'UTC' })} UTC {value !== null && ` · ${iso ? mode.toUpperCase() : 'median'} ${value.toFixed(4)}`}</p>
        {tip && (()=>{const market=markets.find(m=>m.id===tip.id)!;const order=flow.slice().sort((a,b)=>valueAt(series[b.market.id][mode],tip.time)-valueAt(series[a.market.id][mode],tip.time));const price=valueAt(series[tip.id][mode],tip.time);const delta=price-valueAt(series[tip.id][mode],start);return <div className="chart-tip flow-tip" style={{left:Math.max(8,Math.min(width-288,tip.x-160)),top:Math.max(8,tip.y-100)}}><strong>{market.name}</strong><span>Rank {order.findIndex(m=>m.market.id===tip.id)+1} · {mode.toUpperCase()} {price.toFixed(4)}</span><span>Change {delta<0?'−':'+'}{Math.abs(delta).toFixed(4)}</span><time>{new Date(tip.time*1000).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})} UTC</time></div>;})()}

      </div>
      {expanded && <aside className="plot-aside" aria-label="Repositories in chart"><input aria-label="Filter repositories" placeholder="Filter repositories" value={asideQ} onChange={event => setAsideQ(event.target.value)}/><div className="aside-list">{markets.filter(market => market.name.toLowerCase().includes((asideQ || q).toLowerCase())).map(market => ({ market, value:valueAt(series[market.id][mode], t) })).sort((a, b) => b.value - a.value).map(({ market, value }, index) => <button key={market.id} className={market.id === iso || market.id === selectedId ? 'on' : ''} onMouseEnter={() => updateQuery({ iso:market.id }, true)} onFocus={() => updateQuery({ iso:market.id }, true)} onClick={() => updateQuery({ iso:market.id }, true)}><i>{index + 1}</i><span>{market.name}</span><b>{value.toFixed(4)}</b></button>)}</div></aside>}
    </div>
    <div className="median-band"><div className="plot-key"><span><i/>Global median {band.at(-1)?.p50.toFixed(3)}</span><span><i className="band-key"/>10th–90th percentile</span></div><svg viewBox={`0 0 ${width} 90`} preserveAspectRatio="none" role="img" aria-label="Market median and tenth to ninetieth percentile price band"><path d={bandPath(band)??''} fill="var(--lilac)" opacity=".2"/><path d={medianPath(band)??''} fill="none" stroke="var(--median)" strokeWidth="2.5"/></svg></div>
    <ReplayStrip t={t} playing={playing} togglePlay={replay} scrub={scrub} speed={speed} setSpeed={setSpeed} loop={loop} setLoop={setLoop}/>
    <details className="chart-data-table"><summary>Keyboard-accessible chart data</summary><div><table><thead><tr><th>Repository</th><th>{mode.toUpperCase()}</th><th>Change since Oct 1</th></tr></thead><tbody>{baseMarkets.map(market => { const current = valueAt(series[market.id][mode], t), first = series[market.id][mode][0]?.value ?? current; return <tr key={market.id}><th>{market.name}</th><td>{current.toFixed(4)}</td><td>{current - first < 0 ? '−' : '+'}{Math.abs(current - first).toFixed(4)}</td></tr>; })}</tbody></table></div></details>
  </section>;
}
