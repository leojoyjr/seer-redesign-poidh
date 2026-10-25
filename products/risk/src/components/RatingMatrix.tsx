import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {assets,band,pct,quarter,type Asset} from '../math/model';
import {grade,horizonPD,logPD,swarm,tiers} from '../math/matrix';
import {useRisk} from '../store';
import {Icon,type IconName} from './icons';
function Shape({group}:{group:Asset['group']}){return group==='usd'?<circle r="6"/>:group==='btc'?<rect x="-6" y="-6" width="12" height="12"/>:<path d={group==='eth'?'M0 -7L7 0 0 7 -7 0Z':'M-7 0L-3.5 -6H3.5L7 0 3.5 6H-3.5Z'}/>}
export function RatingMatrix(){
 const s=useRisk(),ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(600),[hover,setHover]=useState<Asset|null>(null);
 useEffect(()=>{const ro=new ResizeObserver(([e])=>setWidth(Math.max(600,e.contentRect.width)));if(ref.current)ro.observe(ref.current);return()=>ro.disconnect()},[]);
 const list=assets.filter(a=>s.selected.includes(a.id)),rows=tiers.filter(g=>list.some(a=>grade(a)===g));
 const left=76,right=28,plot=width-left-right;
 const packed=rows.map(g=>{const dots=swarm(list.filter(a=>grade(a)===g),s.horizon,plot);return {g,dots,height:Math.max(48,...dots.map(p=>Math.abs(p.y)*2+44))}});
 let offset=48;
 const layout=packed.map(row=>{const y=offset+row.height/2;offset+=row.height;return {...row,y}}),height=offset+44;
 const leaders=[...list].sort((a,b)=>b.m-a.m).slice(0,6).map(a=>a.id);
 const zones=[{name:'Low',lo:.0001,hi:.02,key:'low',shape:'circle' as IconName},{name:'Moderate',lo:.02,hi:.05,key:'mod',shape:'diamond' as IconName},{name:'High',lo:.05,hi:.1,key:'high',shape:'triangle' as IconName},{name:'Critical',lo:.1,hi:1,key:'crit',shape:'square' as IconName}];
 return <div className="matrix-body" ref={ref}><div className="matrix-band-key">{zones.map(z=><span key={z.key} className={`zone-${z.key}`}><Icon name={z.shape} size={12}/>{z.name} {z.lo===.0001?'0':z.lo*100}–{z.hi*100}%</span>)}</div><div className="matrix-scroll"><svg width={width} height={height} role="img" aria-label="Credora grade by logarithmic probability of default" onMouseLeave={()=>setHover(null)}>
 <defs><marker id="estimate-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L8 4 0 8" fill="none" stroke="var(--estimate)"/></marker></defs>
 {zones.map(z=><rect key={z.key} x={left+logPD(z.lo)*plot} y="32" width={(logPD(z.hi)-logPD(z.lo))*plot} height={offset-32} className={`matrix-zone zone-${z.key}`}/>)}
 {[.0001,.001,.01,.1,1].map(p=><g key={p}><path d={`M${left+logPD(p)*plot} 32V${offset}`} className="grid-line"/><text x={left+logPD(p)*plot} y={height-22} textAnchor="middle">{p*100}%</text></g>)}
 {layout.map(({g,dots,height:rh,y},ri)=><g key={g}><g className="matrix-row" style={{animationDelay:`${ri*30}ms`}}><path d={`M${left} ${y+rh/2}H${width-right}`} className="grid-line"/><text x="4" y={y-4}>{g}</text><text x="4" y={y+14} className="matrix-count">{dots.length} assets</text></g>{dots.map(({a,x,y:dy})=>{
 const edited=s.edited.some(v=>v.id===a.id),estimate=s.estimates[a.id]??a.m,ex=logPD(horizonPD(estimate,s.horizon))*plot;
 return <g key={a.id} className="matrix-position" style={{transform:`translate(${left+x}px,${y+dy}px)`}}><g data-testid={`matrix-dot-${a.id}`} className="matrix-dot" style={{'--drop':`${Math.min(32,list.indexOf(a))*30}ms`,opacity:hover&&hover.id!==a.id?.2:1} as CSSProperties} tabIndex={0} role="button" aria-label={`${a.ticker}, ${g}, PD ${pct(horizonPD(a.m,s.horizon))}, Details`} onFocus={()=>setHover(a)} onBlur={()=>setHover(null)} onMouseEnter={()=>setHover(a)} onClick={()=>s.setDrawer(a)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();s.setDrawer(a)}if(e.key==='Escape')setHover(null)}}>
 <circle r="12" fill="transparent"/><g className="market-shape"><Shape group={a.group}/></g>
 {edited&&<g data-testid={`matrix-estimate-${a.id}`} className="matrix-estimate"><path d={`M${ex>x?9:-9} 0H${ex-x}`} markerEnd="url(#estimate-arrow)"/><path transform={`translate(${ex-x} 0)`} d="M0 -7L7 0 0 7 -7 0Z" className="estimate-dot"/><title>Your estimate {pct(estimate)}</title></g>}
 {(leaders.includes(a.id)||hover?.id===a.id)&&<text x={x>plot-70?-10:10} y={dy>0?22:-14} textAnchor={x>plot-70?'end':'start'} className="matrix-label">{a.ticker}</text>}
 {edited&&<text x={ex-x} y="-22" textAnchor="middle" className="estimate-label">Your estimate {estimate>=a.m?'+':'−'}{(Math.abs(horizonPD(estimate,s.horizon)-horizonPD(a.m,s.horizon))*100).toFixed(2)} pp</text>}
 </g></g>})}</g>)}
 </svg></div>{hover&&<div className="matrix-tooltip" data-overlay data-testid="hover-card" role="tooltip"><strong>{hover.ticker} · {grade(hover)}</strong><span>{hover.category||'No rating'}</span><dl><dt>PD (Ann.)</dt><dd>{pct(hover.m)}</dd><dt>PD (Quart.)</dt><dd>{pct(quarter(hover.m))}</dd><dt>Band</dt><dd>{band(horizonPD(hover.m,s.horizon))}</dd></dl></div>}</div>;
}
