import {useEffect,useRef,useState} from 'react';
import {Icon} from './icons';
import {groupShape} from './Picker';
import {pct,quarter,position,band,type Asset} from '../math/model';
import {useRisk} from '../store';
// Survival S(t) = (1-PD)^t over the year, drawn on its own min..1 scale: y = (1 - S) / (1 - Smin), floored at 1% so near-zero PD stays flat.
export function curve(m:number,w:number,h:number){const range=Math.max(.01,m);return Array.from({length:25},(_,i)=>`${i?'L':'M'}${(i/24*w).toFixed(1)},${(2+(1-(1-m)**(i/24))/range*(h-4)).toFixed(1)}`).join(' ')}
export function Tile({a}:{a:Asset}){const s=useRisk();const ref=useRef<HTMLElement>(null);const [seen,setSeen]=useState(false);const [replay,setReplay]=useState(0);const selected=s.selected.includes(a.id);
 useEffect(()=>{const el=ref.current;if(!el||typeof IntersectionObserver==='undefined'){setSeen(true);return}const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setSeen(true);io.disconnect()}},{threshold:.4});io.observe(el);return()=>io.disconnect()},[]);
 const d=curve(a.m,64,44);
 return <article ref={ref} className="asset-tile" data-selected={selected} data-testid={`asset-tile-${a.id}`} onPointerEnter={()=>setReplay(n=>n+1)}>
  <button className="tile-main" aria-label={`${a.ticker} Credora details`} onClick={()=>s.setDrawer(a)}>
   <span className="t-top"><span className="t-tk"><Icon name={groupShape[a.group]} size={14}/>{a.ticker}</span><span className="rv-chip">{a.grade||'-'}</span></span>
   <span className="t-body"><span className="t-nums"><span className="t-cap">PD (Ann.)</span><b>{pct(a.m)}</b><span className="t-q">{pct(quarter(a.m))} (Quart.)</span></span>
    <svg viewBox="0 0 64 44" preserveAspectRatio="none" role="img" aria-label={`${a.ticker} survival curve`}><path d={`${d}L64 44H0Z`} className={seen?'spark-fill on':'spark-fill'} key={`f${replay}`}/><path d={d} pathLength="1" className={seen?'spark-line on':'spark-line'} key={`l${replay}`}/></svg></span>
   <span className="tile-gauge" role="img" aria-label={`${band(a.m)} risk on logarithmic scale`}><i style={{left:`${position(a.m)}%`}}/></span>
  </button>
  <button className="tile-select rv-btn rv-btn--icon rv-btn--secondary" aria-label={`${selected?'Deselect':'Select'} ${a.ticker}`} aria-pressed={selected} onClick={()=>s.toggle(a.id)}><Icon name="check" size={14}/></button>
 </article>}
