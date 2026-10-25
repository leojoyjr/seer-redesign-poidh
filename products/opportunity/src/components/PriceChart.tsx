import {useMemo} from 'react';
import type {Submission} from '../data/markets';
import {seededRng} from '../math/rng';
/** A seeded sample bridge ends at the same quoted price shown in the ticket. */
export function PriceChart({submission:o,large=false}:{submission:Submission;large?:boolean}){
 const points=useMemo(()=>{const seed=[...o.id].reduce((s,c)=>Math.imul(s,31)+c.charCodeAt(0),7),rng=seededRng(seed);const price=(o.odds??0)/100;return Array.from({length:29},(_,i)=>i===28?price:Math.max(0,price*(.52+.48*i/28+(rng()-.5)*.14)));},[o.id,o.odds]);
 const lo=Math.min(...points),hi=Math.max(...points),pad=Math.max((hi-lo)*.12,.0001),min=Math.max(0,lo-pad),max=hi+pad;
 const height=large?220:96,top=16,bottom=height-24,left=48,right=242,y=(p:number)=>bottom-(p-min)/(max-min)*(bottom-top);
 const path=points.map((p,i)=>`${i?'L':'M'}${left+i/28*(right-left)},${y(p)}`).join(' '),end=points[28];
 return <div className={`price-chart ${large?'large':''}`}><div className="data-line"><span>Price history · sDAI</span><small>Sample</small></div><svg viewBox={`0 0 320 ${height}`} role="img" aria-label={`Sample price history for ${o.name}, ${(min).toFixed(3)} to ${max.toFixed(3)} sDAI, 14 days ago to Today`}><path className="chart-axis" d={`M${left} ${top}V${bottom}H${right}M${left} ${top}H${right}`}/><text x="0" y={top+4}>{max.toFixed(3)}</text><text x="0" y={bottom}>{min.toFixed(3)}</text><path className="chart-series" d={path}/><circle cx={right} cy={y(end)} r="3"/><text className="chart-end" x={right+8} y={y(end)+4}>{end.toFixed(3)}</text><text x={left} y={height-4}>14 days ago</text><text x={right} y={height-4} textAnchor="end">Today</text></svg></div>;
}
