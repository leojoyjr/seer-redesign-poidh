import {useEffect,useMemo,useRef,useState} from 'react';
import {assets,history,pct} from '../math/model';
import type {CSSProperties} from 'react';
import {useRisk} from '../store';
export function OverTime(){
 const s=useRisk();
 const ref=useRef<HTMLDivElement>(null);const [width,setWidth]=useState(760);
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setWidth(Math.max(240,entry.contentRect.width)));if(ref.current)observer.observe(ref.current);return()=>observer.disconnect()},[]);
 const end=width-(width<400?126:180),label=end+16;
 const [cross,setCross]=useState<{x:number;y:number}|null>(null);
 const series=useMemo(()=>assets.filter(a=>s.selected.includes(a.id)).sort((a,b)=>b.m-a.m).map(a=>({a,points:history(a)})),[s.selected]);
 const selKey=series.map(v=>v.a.id).join(',');
 const times=series.flatMap(v=>v.points.map(p=>p.time));
 const min=Math.min(...times),max=Math.max(...times);
 const height=Math.max(320,series.length*40+96),top=36,bottom=height-52;
 const step=(bottom-top)/Math.max(1,series.length);
 const x=(t:number)=>24+(t-min)/Math.max(1,max-min)*(end-24);
 const rows=series.map(({a,points},i)=>{
  const estimate=s.estimates[a.id]??a.m,edited=s.edited.some(v=>v.id===a.id);
  const values=[...points.map(p=>p.p),a.m,...(edited?[estimate]:[])];
  const low=Math.min(...values),high=Math.max(...values);
  // Each ridge fits its own observed PD range, including the user's estimate.
  const y=(p:number)=>top+i*step+step*.85-(p-low)/Math.max(high-low,a.m*.001,1e-9)*step*.65;
  const baseline=top+i*step+step*.95;
  const path=points.map((p,j)=>`${j?'L':'M'}${x(p.time)},${y(p.p)}`).join(' ');
  return {a,points,estimate,edited,y,baseline,path};
 });
 const timestamp=cross?min+(cross.x-24)/(end-24)*(max-min):min;
 const inspection=cross?rows.map(row=>({...row,point:row.points.reduce<typeof row.points[number]|undefined>((best,p)=>!best||Math.abs(p.time-timestamp)<Math.abs(best.time-timestamp)?p:best,undefined)})).filter(v=>v.point).sort((a,b)=>Math.abs(a.y(a.point!.p)-cross.y)-Math.abs(b.y(b.point!.p)-cross.y))[0]:undefined;
 return <div className="time-scroll" ref={ref}><svg data-testid="overtime-chart" style={{height}} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Market PD history, individually normalized ridges" tabIndex={0}
 onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();setCross({x:Math.max(24,Math.min(end,(e.clientX-r.left)/r.width*width)),y:(e.clientY-r.top)/r.height*height})}}
 onPointerLeave={()=>setCross(null)} onBlur={()=>setCross(null)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();setCross({x:Math.max(24,Math.min(end,(cross?.x??24)+(e.key==='ArrowRight'?12:-12))),y:cross?.y??top})}}}>
 {rows.map(({a,points,estimate,edited,y,baseline,path},i)=><g key={a.id} style={{color:i%2?'var(--text-2)':'var(--violet-text)'}}>
 <path d={`M24 ${baseline}H${end}l16 -8`} className="grid-line"/>
 {points.length>0&&<g key={`${a.id}:${selKey}`} className="ot-draw" style={{'--i':Math.min(i,12)} as CSSProperties}><path d={`${path}L${end} ${baseline}H${x(points[0].time)}Z`} className="ot-fill" fill="currentColor" fillOpacity=".08"/>
 <path d={path} pathLength="1" className="ot-line" fill="none" stroke="currentColor" strokeWidth="1.5"/></g>}
 <circle cx={end} cy={y(a.m)} r="3" fill="currentColor"/>
 {edited&&<g data-testid={`overtime-your-${a.id}`}><path d={`M${end} ${y(a.m)}L${end+24} ${y(estimate)}`} className="user-ridge"/><path d="M0 -5L5 0 0 5 -5 0Z" transform={`translate(${end+24} ${y(estimate)})`} fill="var(--estimate)"/><title>Your estimate {a.ticker} {pct(estimate)}</title></g>}
 <text x={label} y={top+i*step+step*.55} data-testid={`overtime-end-label-${a.id}`}>{a.ticker} {pct(a.m)}{edited&&<tspan x={label} dy="16" className="estimate-label">Your estimate {pct(estimate)}</tspan>}</text>
 </g>)}
 {cross&&<g><path d={`M${cross.x} ${top-8}V${bottom}`} className="crosshair"/>{inspection?.point&&<><circle cx={x(inspection.point.time)} cy={inspection.y(inspection.point.p)} r="4" fill="var(--violet-text)"/><text x="24" y="16">{inspection.a.ticker} {pct(inspection.point.p,3)} · {new Date(inspection.point.time*1000).toISOString().replace('T',' ').slice(0,19)}</text></>}</g>}
 <text x="24" y={height-20}>{new Date(min*1000).toISOString().slice(0,10)}</text><text x={end} y={height-20} textAnchor="end">{new Date(max*1000).toISOString().slice(0,10)}</text>
 </svg></div>;
}
