import {useSyncExternalStore} from 'react';
import metadata from './markets.json';
import live from './live_outcomes.json';
import final from './finalized_outcomes.json';
import devcon from './devcon_outcomes.json';
import {seededRng} from '../math/rng';
export interface Submission {id:string; name:string; odds:number|null; rank:number; change:number}
export interface Market {id:string; title:string; status:string; outcomes:number; volume:number; liquidity:number; decision:string; opened:string; sample:boolean; rows:Submission[]; winner?:string; tick:number}
export type Status='Active'|'Completed'|'All';
const files=[live,final,devcon];
const real:Market[]=metadata.markets.map((m,i)=>({...m,decision:m.decision.startsWith('Top')?'Top 5':'1 winner',sample:false,tick:0,rows:files[i].map((o,j)=>({...o,id:`${m.id}-${j}`,change:0}))}));
const names=['Gnosis community identity','Seer agent review','Open decision research','Devcon contributor designs','Public goods designs','Seer grants review','Community archive identity','AI research submissions','Opportunity protocol name'];
const themes=[
 [['Gnosis','Civic','Collective','Commons','Oracle','Community','Network','Assembly'],['Monogram','Wordmark','Emblem','Identity','Mark','Symbol','Seal','Letterform','Pattern']],
 [['Tool use','Reasoning','Planning','Memory','Retrieval','Execution','Safety','Evaluation'],['Benchmark','Audit','Review','Harness','Suite','Report','Study','Trial','Protocol']],
 [['Deliberation','Voting','Delegation','Consensus','Selection','Incentive','Governance','Coordination'],['Study','Experiment','Survey','Analysis','Replication','Framework','Dataset','Review','Model']],
 [['Mumbai','Monsoon','Gateway','Protocol','Contributor','Devcon','Local','Builder'],['Shirt','Poster','Patch','Print','Tote','Badge','Pattern','Jersey','Sticker']],
 [['Commons','Civic','Open source','Public','Community','Shared','Local','Cooperative'],['Atlas','Map','Toolkit','Directory','Library','Dashboard','Guide','Archive','Index']],
 [['Client diversity','ZK tooling','Public archives','Local nodes','Research access','Open hardware','Developer education','Protocol testing'],['Fund','Fellowship','Initiative','Programme','Lab','Project','Grant','Collective','Workshop']],
 [['Living','Civic','Community','Oral','Digital','Local','Shared','Open'],['Archive','Index','Collection','Ledger','Registry','Record','Library','Catalogue','Chronicle']],
 [['Mechanistic','Alignment','Interpretability','Inference','Multimodal','Robustness','Reasoning','Agent'],['Study','Benchmark','Dataset','Evaluation','Experiment','Analysis','Survey','Replication','Report']],
 [['Agora','Praxis','Civitas','Accord','Quorum','Mandate','Forum','Polis'],['Protocol','Network','Exchange','Commons','Assembly','Collective','Council','Layer','Market']],
];
const random=seededRng(4821);
const samples:Market[]=names.map((title,i)=>{
 const count=24+Math.floor(random()*44),floor=Math.floor(count*.2),priced=Math.floor(count*.6);
 // A shifted Zipf distribution allocates the remaining mass above the 0.4% floor.
 const weights=Array.from({length:priced},(_,j)=>1/Math.pow(j+1.8,1.08));
 const total=weights.reduce((a,b)=>a+b,0),[subjects,forms]=themes[i];
 const rows=Array.from({length:count},(_,j)=>({id:`sample-${i+1}-${j}`,name:`${subjects[j%subjects.length]} ${forms[Math.floor(j/subjects.length)]}`,rank:j+1,change:0,odds:j<priced?.41+weights[j]/total*(100-floor*.4-priced*.41):j<priced+floor?.4:null}));
 const status=i%3===2?'Finalized':'Active',decision=i%3===0?'Top 5':'1 winner';
 return {id:`sample-${i+1}`,title,status,outcomes:count,volume:Math.round(2000+random()*18000),liquidity:Math.round(300+random()*4000),decision,opened:`2026-10-${String(i+1).padStart(2,'0')}`,sample:true,tick:0,rows,...(status==='Finalized'&&decision==='1 winner'?{winner:rows[0].name}:{})};
});
const n=Number(new URLSearchParams(location.search).get('n')??12);
const all=[...real,...samples].slice(0,Number.isFinite(n)?Math.max(1,Math.min(12,Math.floor(n))):12);
export const fundedPositions=()=>Object.fromEntries(all.filter(m=>m.status==='Finalized').flatMap(m=>m.rows.filter(o=>m.winner?o.name===m.winner:m.decision==='Top 5'&&o.rank<=5).map(o=>[o.id,10])));
const query=new URLSearchParams(location.hash.split('?')[1]);
const parseStatus=(q:URLSearchParams,fallback:Status='Active'):Status=>{const value=q.get('filter')??q.get('status');return value?.toLowerCase()==='completed'?'Completed':value?.toLowerCase()==='all'?'All':value?.toLowerCase()==='active'?'Active':fallback;};
let state={markets:all,selectedId:all[0].id,submissionId:all[0].rows[0].id,status:parseStatus(query),search:query.get('q')??'',decision:query.get('decision')??'All',size:query.get('size')??'Any',sort:query.get('sort')??'Featured',view:query.get('view')??'Cards',connected:false,balance:250,positions:fundedPositions() as Record<string,number>};
const listeners=new Set<()=>void>();
export function updateMarkets(patch:Partial<typeof state>){state={...state,...patch};listeners.forEach(fn=>fn());}
export function selectMarket(id:string){const m=state.markets.find(m=>m.id===id);if(m&&id!==state.selectedId)updateMarkets({selectedId:id,submissionId:m.rows[0].id});}
export function setFilters(patch:Partial<typeof state>){
 const changed=patch.status!==undefined&&patch.status!==state.status;
 updateMarkets(patch);
 // Only an explicit user filter change may replace a hidden selection.
 if(changed){const visible=state.markets.filter(m=>state.status==='All'||m.status===(state.status==='Active'?'Active':'Finalized'));if(visible.length&&!visible.some(m=>m.id===state.selectedId)){selectMarket(visible[0].id);}}
 const q=new URLSearchParams(location.hash.split('?')[1]);
 for(const key of ['status','search','decision','size','sort','view'] as const)q.set(key==='search'?'q':key,state[key]);
 q.set('filter',state.status.toLowerCase());
 const path=changed&&location.hash.startsWith('#/m/')?`#/m/${state.selectedId}`:location.hash.split('?')[0]||'#/';
 location.hash=`${path}?${q}`;
}
export function useMarkets(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn);},()=>state);}
export const ranked=(m:Market)=>[...m.rows].sort((a,b)=>(b.odds??-1)-(a.odds??-1));
export const odds=(v:number|null)=>v===null?'-':`${v.toFixed(1)}%`;
export const money=(n:number)=>new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(n);

// Hash queries are restored by browser history as well as by filter controls.
window.addEventListener('hashchange',()=>{
 const q=new URLSearchParams(location.hash.split('?')[1]);
 const status=parseStatus(q);
 updateMarkets({status,search:q.get('q')??'',decision:q.get('decision')??'All',size:q.get('size')??'Any',sort:q.get('sort')??'Featured',view:q.get('view')??'Cards'});
});

// Navigation carries the chosen filter explicitly; history only reads URL state.
export function marketPath(id:string){
 const q=new URLSearchParams();q.set('filter',state.status.toLowerCase());
 return `/m/${id}?${q}`;
}

let feedEnabled=true;
export function tickOdds(){
 if(!feedEnabled||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const m=state.markets.find(m=>m.id===state.selectedId);
 if(!m||m.status!=='Active')return;
 const leaders=ranked(m).filter(o=>(o.odds??0)>.45).slice(0,2);if(leaders.length<2)return;
 // Transfer mass between two priced submissions; tiers and total odds stay fixed.
 const delta=m.tick%2===0?.02:-.02;
 const rows=m.rows.map(o=>o.id===leaders[0].id?{...o,odds:(o.odds??0)+delta,change:delta}:o.id===leaders[1].id?{...o,odds:(o.odds??0)-delta,change:-delta}:{...o,change:0});
 updateMarkets({markets:state.markets.map(v=>v.id===m.id?{...m,rows,tick:m.tick+1}:v)});
}
if(import.meta.env.DEV||import.meta.env.MODE==='test'){Object.defineProperty(window,'__oppTest',{configurable:true,value:{getState:()=>state,selectMarket,tick:tickOdds,setFeed:(enabled:boolean)=>{feedEnabled=enabled;},reset:()=>updateMarkets({selectedId:all[0].id,submissionId:all[0].rows[0].id,status:'Active',search:'',decision:'All',size:'Any',sort:'Featured',view:'Cards',connected:false,balance:250,positions:fundedPositions()}),outcomes:(id=state.selectedId)=>state.markets.find(m=>m.id===id)?.rows??[]}});}
