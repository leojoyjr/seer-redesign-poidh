import { useEffect, useMemo, useRef, useState } from 'react';
import type { Market } from '../data/types';
import { END, START, series, valueAt } from '../data/series';
import { envelope } from '../data/envelope';
import { Icon } from './Icon';
import { Segments } from './Segments';

const palette = ['#7B3FF2', '#B9A8FF', '#FFFFFF', '#4B3BFF', '#E6DEFF', '#9B78EE'];
export function SidewaysComparison({rows,initial,close,select,loading=false}:{loading?:boolean;rows:Market[];initial:string;close:()=>void;select:(id:string)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null), list=useRef<HTMLDivElement>(null);
  const [primary,setPrimary]=useState(initial), [pins,setPins]=useState<string[]>([]), [q,setQ]=useState('');
  const [mode,setMode]=useState<'UP'|'DOWN'>('UP'), [range,setRange]=useState<'1D'|'3D'|'1W'|'All'>('All');
  const [hover,setHover]=useState<number|null>(null);
  const sorted=useMemo(()=>[...rows].sort((a,b)=>b.up-a.up||a.name.localeCompare(b.name)),[rows]);
  const filtered=sorted.filter(m=>m.name.toLowerCase().includes(q.toLowerCase()));
  const selected=rows.find(m=>m.id===primary)??rows[0];
  const shown=[selected,...pins.filter(id=>id!==selected?.id).map(id=>rows.find(m=>m.id===id)!)].filter(Boolean);
  const color=(id:string)=>palette[id===primary?0:1+pins.indexOf(id)];
  const toggle=(id:string)=>setPins(p=>p.includes(id)?p.filter(x=>x!==id):p.length<5?[...p,id]:p);
  useEffect(()=>{const before=document.activeElement as HTMLElement;const el=dialog.current;el?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;el?.close();before?.focus();};},[]);
  useEffect(()=>{list.current?.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});},[primary]);
  const start=range==='All'?START:Math.max(START,END-({'1D':1,'3D':3,'1W':7}[range])*86400);
  const side=mode==='UP'?'up':'down';
  const distribution=useMemo(()=>envelope.map(p=>{const v=rows.map(m=>valueAt(series[m.id][side],p.t)).sort((a,b)=>a-b);const quantile=(f:number)=>{const n=(v.length-1)*f,i=Math.floor(n);return (v[i]??0)+((v[Math.ceil(n)]??0)-(v[i]??0))*(n-i);};return {t:p.t,p10:quantile(.1),p50:quantile(.5),p90:quantile(.9)};}),[rows,side]);
  const times=[start,...envelope.filter(p=>p.t>start&&p.t<END).map(p=>p.t),END];
  const values=shown.flatMap(m=>[valueAt(series[m.id][side],start),...series[m.id][side].filter(p=>p.t>=start).map(p=>p.value)]);
  const lo=Math.min(...values),hi=Math.max(...values),padding=Math.max(.002,(hi-lo)*.08),min=lo-padding,max=hi+padding;
  const x=(t:number)=>60+(t-start)/(END-start)*760, y=(v:number)=>360-(v-min)/(max-min)*330;
  const path=(points:{t:number;value:number}[])=>points.map((p,i)=>`${i?'L':'M'}${x(p.t)},${y(p.value)}`).join(' ');
  const badgeY:Record<string,number>={};
  const endings=[...shown].sort((a,b)=>y(valueAt(series[a.id][side],END))-y(valueAt(series[b.id][side],END)));
  endings.forEach((m,i)=>{badgeY[m.id]=Math.max(28,y(valueAt(series[m.id][side],END)),i?badgeY[endings[i-1].id]+26:28);});
  if(endings.length&&badgeY[endings.at(-1)!.id]>354){badgeY[endings.at(-1)!.id]=354;for(let i=endings.length-2;i>=0;i--)badgeY[endings[i].id]=Math.min(badgeY[endings[i].id],badgeY[endings[i+1].id]-26);}
  const date=(t:number)=>new Date(t*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
  return <dialog ref={dialog} className="sideways-dialog" data-testid="sideways-comparison" aria-labelledby="comparison-title" onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>{
    if(e.key==='Tab'){const controls=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,[tabindex="0"]')??[]).filter(el=>el.getClientRects().length);if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0]?.focus();}}
    if((e.target as HTMLElement).matches('input'))return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const i=filtered.findIndex(m=>m.id===primary);const next=filtered[Math.max(0,Math.min(filtered.length-1,i+(e.key==='ArrowDown'?1:-1)))];if(next)setPrimary(next.id);}
    if((e.target as HTMLElement).closest('.sideways-row')&&e.key===' '){e.preventDefault();toggle(primary);}
    if((e.target as HTMLElement).closest('.sideways-row')&&e.key==='Enter'){e.preventDefault();select(primary);}
  }}>
    <button className="sideways-close" aria-label="Close sideways comparison" onClick={close}><Icon name="close"/></button>
    <aside className="sideways-left"><h2 id="comparison-title">Sideways comparison</h2><input autoFocus aria-label="Search comparison repositories" placeholder="Search repositories" value={q} onChange={e=>setQ(e.target.value)}/><p className="sideways-hint">↑ ↓ select · Space pin · Enter open · {pins.length}/5 pinned</p><div className="sideways-list" aria-busy={loading} ref={list} role="listbox" aria-label="Repositories ranked by current UP">
      {loading&&<p role="status">Loading repository prices…</p>}{filtered.map(m=>{const delta=m.up-valueAt(series[m.id].up,START),pinned=pins.includes(m.id);return <div key={m.id} className="sideways-row" role="option" aria-selected={primary===m.id} tabIndex={primary===m.id?0:-1} onFocus={()=>setPrimary(m.id)} onClick={()=>setPrimary(m.id)}><span>{sorted.findIndex(r=>r.id===m.id)+1}</span><span className="sideways-name">{m.name}</span><strong>{m.up.toFixed(4)}</strong><span className={delta<0?'loss':'gain'}>{delta>=0?'+':''}{delta.toFixed(3)}</span><button aria-label={`${pinned?'Unpin':'Pin'} ${m.name}`} aria-pressed={pinned} disabled={!pinned&&pins.length===5} onClick={e=>{e.stopPropagation();toggle(m.id);}}>{pinned?<i style={{background:color(m.id)}}/>:<Icon name="compare" size={16}/>}</button></div>;})}
      {!filtered.length&&<p role="status">No repositories match. <button onClick={()=>setQ('')}>Clear search</button></p>}
    </div></aside>
    <section className="sideways-right">{!selected?<p role="status">Repository data is unavailable.</p>:<><header><h2>{selected.name}</h2><div className="sideways-summary"><span>Rank #{sorted.findIndex(m=>m.id===primary)+1}</span><span>UP <b>{selected.up.toFixed(4)}</b></span><span>Since Oct 1 <b className={selected.up<valueAt(series[selected.id].up,START)?'loss':'gain'}>{(selected.up-valueAt(series[selected.id].up,START)).toFixed(4)}</b></span><span>Gap <b>{selected.residual.toFixed(4)}</b></span></div></header>
    <div className="sideways-chips">{pins.map(id=>{const m=rows.find(r=>r.id===id)!;return <button key={id} onClick={()=>toggle(id)} aria-label={`Unpin ${m.name}`}><i style={{background:color(id)}}/><span>{m.name}</span><Icon name="close" size={14}/></button>;})}{!pins.length&&<span>Pin up to five repositories to keep their lines in view.</span>}</div>
    <div className="sideways-controls"><Segments values={['UP','DOWN'] as const} value={mode} change={setMode} label="Comparison price side"/><Segments values={['1D','3D','1W','All'] as const} value={range} change={setRange} label="Comparison date range"/></div>
    <div className="sideways-chart" tabIndex={0} role="img" aria-label={`${mode} chart for ${shown.map(m=>m.name).join(', ')}. Values also available in the statistics below.`} onPointerLeave={()=>setHover(null)} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setHover(start+Math.max(0,Math.min(1,((e.clientX-r.left)/r.width*920-60)/760))*(END-start));}}>
      <svg viewBox="0 0 920 405" preserveAspectRatio="none"><defs><clipPath id="comparison-plot"><rect x="60" y="16" width="760" height="352"/></clipPath></defs>{[0,.25,.5,.75,1].map(f=>{const v=min+(max-min)*f;return <g key={f}><path className="comparison-grid" d={`M60 ${y(v)}H820`}/><text x="50" y={y(v)+4} textAnchor="end">{v.toFixed(3)}</text></g>;})}<g clipPath="url(#comparison-plot)"><path className="comparison-band" d={`${times.map((t,i)=>`${i?'L':'M'}${x(t)},${y(valueAt(distribution.map(p=>({t:p.t,value:p.p90})),t))}`).join(' ')} ${[...times].reverse().map(t=>`L${x(t)},${y(valueAt(distribution.map(p=>({t:p.t,value:p.p10})),t))}`).join(' ')}Z`}/><path className="comparison-median" d={path(times.map(t=>({t,value:valueAt(distribution.map(p=>({t:p.t,value:p.p50})),t)})))}/>
      {shown.map((m,i)=>{const points=series[m.id][side];const steps=[{t:start,value:valueAt(points,start)},...points.filter(p=>p.t>start&&p.t<=END).flatMap(p=>[{t:p.t,value:valueAt(points,p.t-1)},p]),{t:END,value:valueAt(points,END)}];return <path key={`${m.id}-${m.id===primary?'primary':'pinned'}-${mode}-${range}`} className="comparison-line" pathLength="1" d={path(steps)} stroke={color(m.id)} strokeWidth={4-i*.35}/>;})}{hover!==null&&<path className="comparison-crosshair" d={`M${x(hover)} 16V368`}/>}</g>
      {shown.map(m=><g key={m.id}><path d={`M820 ${y(valueAt(series[m.id][side],END))}L826 ${badgeY[m.id]}`} stroke={color(m.id)} fill="none"/><rect x="826" y={badgeY[m.id]-11} width="82" height="22" rx="7" fill="var(--surface-2)" stroke={color(m.id)}/><text x="867" y={badgeY[m.id]+4} textAnchor="middle">{valueAt(series[m.id][side],END).toFixed(4)}</text></g>)}{[0,.25,.5,.75,1].map(f=><text key={f} x={x(start+f*(END-start))} y="394" textAnchor="middle">{date(start+f*(END-start))}</text>)}</svg>
      {hover!==null&&<div className="comparison-tooltip" style={{left:`${Math.max(2,Math.min(58,(hover-start)/(END-start)*100))}%`}}><b>{date(hover)}</b>{shown.map(m=><div key={m.id}><i style={{background:color(m.id)}}/><span>{m.name}</span><strong>{valueAt(series[m.id][side],hover).toFixed(4)}</strong></div>)}</div>}
    </div><p className="sideways-hint">Faint band: 10th–90th percentile · Dashed: global median · Recorded market data</p>
    <div className="sideways-stats">{shown.map(m=><article key={m.id} style={{borderColor:color(m.id)}}><h3><i style={{background:color(m.id)}}/>{m.name}</h3><dl>{[['UP',m.up.toFixed(4)],['Change',(m.up-valueAt(series[m.id].up,START)).toFixed(4)],['Gap',m.residual.toFixed(4)],['Volume',m.volTok.toFixed(2)],['Liquidity',m.liqTok.toFixed(2)],['Price changes',series[m.id].up.length-1]].map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></article>)}</div></>}</section>
  </dialog>;
}
