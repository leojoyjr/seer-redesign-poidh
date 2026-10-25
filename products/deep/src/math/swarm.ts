import { forceSimulation, forceX, forceY, forceCollide, type SimulationNodeDatum } from 'd3-force';
import type { Market } from '../data/types';
export type Dot = SimulationNodeDatum & { market: Market; r: number; x: number; y: number };
// Piecewise exact UP axis: context 16%, focus 70%, context 14%.
export function lens(v: number) { return v < .65 ? (v-.5)/.15*.16 : v <= .85 ? .16+(v-.65)/.2*.70 : .86+(v-.85)/.1*.14; }
export function layout(markets: Market[], width: number, height: number, vertical: boolean, previous: Dot[] = []) {
  const low=Math.min(...markets.map(m=>m.liqTok)), high=Math.max(...markets.map(m=>m.liqTok));
  const axis=(m:Market)=>40+lens(m.up)*((vertical?height:width)-80);
  const nodes: Dot[]=markets.map((market,i)=>{const old=previous.find(d=>d.market.id===market.id);return {market,r:4+4*(market.liqTok-low)/(high-low||1),x:old?.x??(vertical?width/2:axis(market)),y:old?.y??(vertical?axis(market):height*.50+(i%7-3)*12)};});
  // Fix the price coordinate: collision resolves across the axis, never changes UP.
  nodes.forEach(d=>{if(vertical)d.fy=axis(d.market);else d.fx=axis(d.market);});
  const sim=forceSimulation(nodes).force('x',forceX<Dot>(d=>vertical?width/2:axis(d.market)).strength(.3)).force('y',forceY<Dot>(d=>vertical?axis(d.market):height*.50).strength(.08)).force('collision',forceCollide<Dot>(d=>d.r+1).iterations(4)).stop();
  sim.alpha(.3);for(let i=0;i<(previous.length?16:100);i++)sim.tick();sim.stop();
  return nodes;
}
export const splitOrigins = new Map<string, {x:number;y:number}>();
export function captureSplitOrigins(){
  splitOrigins.clear();document.querySelectorAll<HTMLElement>('.market-row[data-market]').forEach(row=>{const bar=row.querySelector<HTMLElement>('.bar'),up=bar?.querySelector<HTMLElement>('.up');if(!bar||!up)return;const r=bar.getBoundingClientRect();splitOrigins.set(row.dataset.market!,{x:r.left+up.getBoundingClientRect().width,y:r.top+r.height/2});});
}
