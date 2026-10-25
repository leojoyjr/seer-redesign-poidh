import raw from '../data/credora.json';
import api from '../data/credora_api.json';
import chart from '../data/chart.json';
export const groups = ['all','eth','usd','btc','funds'] as const;
export type Group = typeof groups[number];
export const names = {all:'All',eth:'ETH Based',usd:'USD Based',btc:'BTC Based',funds:'Funds Based'};
export const glyphs = {all:'∴',eth:'◆',usd:'●',btc:'■',funds:'⬢'};
export const assets = raw.map((a,i) => ({...a,id:a.ticker.toLowerCase(),group:(i<7?'eth':i<20?'usd':i<26?'btc':'funds') as Group,m:parseFloat(a.marketPd || a.pdAnn)/100}));
export type Asset = typeof assets[number];
export type Estimates = Record<string,number>;
export const pct = (p:number,d=2) => p>0 && p*100<10**-d?`<${(10**-d).toFixed(d)}%`:`${(p*100).toFixed(d)}%`;
// Independent survival S(t) = product (1 - PD_i)^t.
export const survival = (values:number[]) => values.reduce((s,p)=>s*(1-p),1);
export const market = survival(assets.map(a=>a.m));
export const quarter = (p:number) => 1-(1-p)**.25;
// Logarithmic slider gives low risks usable space; inverse is exact.
export const position = (p:number) => Math.log1p(100*p)/Math.log(101)*100;
export const probability = (v:number) => (101**(v/100)-1)/100;
// Scale each market hazard by m = -log(target)/sum(lambda_i).
export function rescale(target:number):Estimates {
 const m = -Math.log(target)/assets.reduce((s,a)=>s-Math.log1p(-a.m),0);
 return Object.fromEntries(assets.map(a=>[a.id,target===0?1:target===1?0:-Math.expm1(m*Math.log1p(-a.m))]));
}
export const band = (p:number) => p<.02?'Low':p<.05?'Moderate':p<.1?'High':'Critical';
export function profile(a:Asset) {const key=a.id==='weeth'?'eeth':a.id; return (api as Record<string,{address:string;credora_slug:string;risk_profiles:{metric_name:string;content:string;score:number|null}[]}>)[key];}
export function history(a:Asset) {
 const series=chart.data.find(s=>s.some(p=>[p.pool.token0.name,p.pool.token1.name].includes(a.ticker.toUpperCase().replaceAll('+','PLUS').replaceAll('-','')+'PD'))) || [];
 const points=series.map(p=>({time:p.periodStartUnix,p:1-(1-Math.min(1,Number(p.token0Price),Number(p.token1Price)))**4})).sort((a,b)=>a.time-b.time);
 const last=points.at(-1)?.p || 1;
 return points.map(p=>({...p,p:Math.min(1,p.p*a.m/last)}));
}
export function download(est:Estimates={}) {
 const values=assets.map(a=>est[a.id]??a.m);
 const csv='asset,probability\n'+assets.map((a,i)=>`${a.ticker},${values[i]}`).join('\n')+`\nNo To All,${survival(values)}\n`;
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
 const link=document.createElement('a');link.href=url;link.download=`risk-pricing-predictions-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
