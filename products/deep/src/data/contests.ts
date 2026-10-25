import zcash from './real/contests/zcash.json';
import nu7 from './real/contests/zcash-nu7.json';
import octant from './real/contests/octant.json';
import round2 from './real/contests/round2.json';
import l1 from './real/contests/round2-l1.json';
import l2 from './real/contests/round2-l2.json';
import { markets } from './markets';
import liveCharts from './real/get-market-charts.json';
export type ContestRow={id:string;name:string;price:number|null;other:number|null;group?:string;points:number[][];downPoints:number[][]};
export type Contest={id:string;name:string;kind:string;live:boolean;rows:ContestRow[];marketCount:number|null};
type RawMarket={id:string;marketName?:string;outcomes?:string[];prices?:(number|null)[];upPrice?:number;downPrice?:number;yesPrice?:number;noPrice?:number;price?:number};
type Chart={series:{outcomeName:string;points:number[][]}[]};
type Fixture={markets:{marketsData?:Record<string,RawMarket>;markets?:RawMarket[]};charts:Record<string,Chart>};
function adapt(id:string,name:string,kind:string,fixture:unknown):Contest {
 const f=fixture as Fixture;const rows:ContestRow[]=[];
 if(f.markets.marketsData)for(const [name,m] of Object.entries(f.markets.marketsData)){
  const chart=f.charts[m.id.toLowerCase()]?.series??[];
  if(m.prices){m.prices.forEach((price,i)=>{const s=chart[i];rows.push({id:`${m.id.toLowerCase()}:${i}`,name:s?.outcomeName??`Outcome ${i+1}`,group:name,price,other:null,points:s?.points??[],downPoints:[]});});}
  else rows.push({id:m.id.toLowerCase(),name,price:m.upPrice??m.yesPrice??m.price??null,other:m.downPrice??m.noPrice??null,points:(chart.find(s=>s.outcomeName.toUpperCase()===(kind==='YES / NO'?'YES':'UP'))??chart[0])?.points??[],downPoints:(chart.find(s=>s.outcomeName.toUpperCase()===(kind==='YES / NO'?'NO':'DOWN')))?.points??[]});
 } else for(const m of f.markets.markets??[])m.outcomes?.forEach((name,i)=>{rows.push({id:`${m.id.toLowerCase()}:${i}`,name,group:m.marketName,price:m.prices?.[i]??null,other:null,points:f.charts[m.id.toLowerCase()]?.series.find(s=>s.outcomeName===name)?.points??[],downPoints:[]});});
 // L2 outcome names and ordering come from the API's market definitions, not pool order labels.
 if(id==='round2-l2')for(const row of rows){const [marketId,index]=row.id.split(':');const def=f.markets.markets?.find(m=>m.id.toLowerCase()===marketId);row.name=def?.outcomes?.[Number(index)]??row.name;}
 return {id,name,kind,live:false,rows,marketCount:f.markets.marketsData?Object.keys(f.markets.marketsData).length:(f.markets.markets?.length??0)};
}
export const contests:Contest[]=[{id:'round3',name:'Round 3 · Originality',kind:'UP / DOWN',live:true,marketCount:markets.length,rows:markets.map(m=>({id:m.id,name:m.name,price:m.up,other:m.down,points:liveCharts[m.id as keyof typeof liveCharts]?.series.find(s=>s.outcomeName==='UP')?.points??[],downPoints:[]}))},adapt('zcash-nu7','Zcash · NU7','Multi-outcome',nu7),adapt('zcash-grants','Zcash · Grants','YES / NO',zcash),adapt('octant','Octant','Single price',octant),adapt('round2-l2','Round 2 · L2','Multi-outcome',l2),adapt('round2-l1','Round 2 · L1','Single price',l1),adapt('round2-originality','Round 2 · Originality','UP / DOWN',round2),{id:'round1',name:'Round 1',kind:'Not in live API',live:false,rows:[],marketCount:null}];
export const contestById=(id:string)=>contests.find(c=>c.id===id);
export function contestMedian(c:Contest){const values=c.rows.flatMap(r=>r.price===null?[]:[r.price]).sort((a,b)=>a-b);const n=values.length;return n?(values[Math.floor((n-1)/2)]+values[Math.floor(n/2)])/2:null;}
