import {useEffect,useRef,useState} from 'react';
import {motion} from 'motion/react';
import {odds,type Market,type Submission} from '../data/markets';
import {pack,intensity} from '../math/pack';
import {ScrollCue} from './ScrollCue';
import {Tooltip} from './Tooltip';
import {useOddsColours} from './useOddsColours';
export const tierHint=(tier:string)=>tier==='No pool'?'No trading pool exists for these submissions.':tier==='Tied at 0.4%'?'These submissions share the same quoted odds of 0.4%.':'Filter submissions by their quoted odds.';
export type Tier='All submissions'|'Priced'|'Tied at 0.4%'|'No pool'|'shortlist';
export function isWinner(m:Market,o:Submission){return m.status==='Finalized'&&(m.winner?m.winner===o.name:m.decision==='Top 5'&&o.rank<=5);}
export function Field({variant,market,rows,reviewing,cut,selected,reduced,onSelect,onOpen}:{variant:'Heatmap'|'Bubbles';market:Market;rows:Submission[];reviewing:boolean;cut:number;selected:string;reduced:boolean;onSelect:(id:string)=>void;onOpen:()=>void}){
 const colours=useOddsColours();
 const ref=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:0,height:0});
 useEffect(()=>{const el=ref.current;if(!el)return;const ro=new ResizeObserver(()=>setSize({width:el.clientWidth,height:el.clientHeight}));ro.observe(el);return()=>ro.disconnect();},[]);
 const [hovered,setHovered]=useState<number|null>(null),columns=Math.max(1,Math.floor((size.width-12)/106));
 const priced=rows.filter(o=>o.odds!==null&&o.odds!==.4),floor=rows.filter(o=>o.odds===.4),unpriced=rows.filter(o=>o.odds===null);
 const {height,circles}=pack(priced.map(o=>({id:o.id,weight:o.odds??0})),Math.max(0,size.width-24));
 const min=Math.min(...priced.map(o=>o.odds??1)),max=Math.max(...priced.map(o=>o.odds??1));
 const cell=(o:Submission,i:number,style?:React.CSSProperties)=>{
  const review=rows.findIndex(row=>row.id===o.id)<cut,winner=isWinner(market,o),shade=intensity(o.odds??min,min,max);
  const ink=colours(shade);
  return <motion.button layout={false} key={o.id} data-submission-id={o.id} data-testid={`${style?variant.toLowerCase():'chip'}-${o.id}`} transition={reduced?{duration:0}:variant==='Bubbles'?{type:'spring',stiffness:420,damping:38}:{duration:.2,ease:[.16,1,.3,1]}} style={{...style,...(style?{'--intensity':shade,background:ink.background,'--tile-dark-ink':ink.color,'--tile-light-ink':ink.color}:{})} as React.CSSProperties}  className={`${style?'field-tile':'field-chip'} ${o.id===selected?'selected':''} ${i===0&&style?'leader':''} ${review?'in-review':''} ${reviewing&&!review?'dim':''} ${winner?'winner':''} ${style&&hovered!==null&&(i%columns===hovered%columns||Math.floor(i/columns)===Math.floor(hovered/columns))?'crosshair':''}`} onPointerEnter={()=>setHovered(style?i:null)} onPointerLeave={()=>setHovered(null)} onBlur={()=>setHovered(null)} aria-label={`${o.name} · ${odds(o.odds)}`} aria-pressed={o.id===selected} title={`${o.name} · ${odds(o.odds)}${winner?' · Winner · pays 1.00 sDAI':''}`} onClick={()=>onSelect(o.id)} onDoubleClick={()=>{onSelect(o.id);onOpen();}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();onSelect(o.id);onOpen();}}}>
   <span className="tile-flash" key={`${market.tick}-${o.change}`} data-direction={o.change>0?'up':o.change<0?'down':'none'}/><Tooltip text={`${o.name} · ${odds(o.odds)}`}><strong>{o.name}</strong></Tooltip>{style&&<span>{odds(o.odds)}{i===0&&variant==='Heatmap'?' · Rank 1':''}</span>}
  </motion.button>;
 };
 return <div className={`field ${variant.toLowerCase()}`} data-testid={`${variant.toLowerCase()}-field`} data-market={market.id}><div className="priced-column"><div className="priced-pane" ref={ref}><ScrollCue><div className="field-tiles" style={variant==='Bubbles'?{height}:undefined}>{priced.map((o,i)=>{const c=circles[i];return cell(o,i,variant==='Bubbles'?{left:c.x-c.diameter/2,top:c.y-c.diameter/2,width:c.diameter,height:c.diameter}:{position:'relative'});})}</div></ScrollCue></div></div>
 {(floor.length>0||unpriced.length>0)&&<div className="field-tiers">{[{label:'Tied at 0.4%',items:floor},{label:'No pool',items:unpriced}].filter(t=>t.items.length).map(t=><section className={`tier-pane ${t.label==='No pool'?'no-pool':''}`} key={t.label} aria-label={t.label}><h2><Tooltip text={tierHint(t.label)}>{t.label}</Tooltip><span className="tier-count">{t.items.length}</span></h2><ScrollCue><div className="tier-chips">{t.items.map((o,i)=>cell(o,i))}</div></ScrollCue></section>)}</div>}
 </div>;
}
