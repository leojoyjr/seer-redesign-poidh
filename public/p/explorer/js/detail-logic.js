// Adapted from explorer-v2 outcomes(), tradeQuote() and CSV quoting.
// The unified ledger already stores fractions; never normalize originality or conditional prices.
export function outcomes(m){
 const rows=m.pricing.outcomes.map((o,i)=>({...o,i,p:Number.isFinite(o.p)?o.p:null}));
 const exclusive=['binary','categorical'].includes(m.pricing.kind),sum=rows.reduce((n,o)=>n+(o.p??0),0);
 if(exclusive&&rows.every(o=>o.p!=null)&&sum>0&&Math.abs(sum-1)>.02)return rows.map(o=>({...o,p:o.p==null?null:o.p/sum,normalized:true}));
 return rows;
}
export function quote(m,index,amount,side='buy'){
 const o=outcomes(m)[index],a=Number(amount),probability=['binary','categorical'].includes(m.pricing.kind);
 if(!o)return {error:'Choose a recorded outcome.'};
 if(!Number.isFinite(a)||a<=0||a>1000)return {error:'Enter an amount greater than 0 and no more than 1,000.'};
 // A default probability is not a tradable token quote. Never substitute one for the other.
 const raw=m.pricing.kind==='risk'?(m.history||[]).filter(p=>Number.isFinite(p.values?.[0])).at(-1)?.values[0]:o.p;
 if(!Number.isFinite(raw)||raw<=0)return {error:'No usable saved token quote. Open the product for a current quote.'};
 const sell=side==='sell';
 return {name:o.name,p:raw,avg:raw,get:sell?a*raw:a/raw,impact:null,maxWin:probability&&!sell?a/raw:null,pay:a,sell,indicative:true,routed:!probability};
}
export function csv(m){const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return [['market_id','product','chain','outcome','quote','unit','state','compiled_at'],...m.pricing.outcomes.map(o=>[m.id,m.product,m.chain,o.name,o.p,m.pricing.quoteUnit||m.pricing.headline.unit,m.state,m.compiledAt])].map(r=>r.map(cell).join(',')).join('\r\n')}
export const explorer=m=>({100:'https://gnosisscan.io',10:'https://optimistic.etherscan.io',1:'https://etherscan.io',8453:'https://basescan.org'}[m.chainId]);
export function addresses(m){const found=new Map();function walk(x,path){if(typeof x==='string'&&/^0x[a-f0-9]{40}$/i.test(x)){if(!found.has(x.toLowerCase()))found.set(x.toLowerCase(),{label:path,address:x})}else if(x&&typeof x==='object')Object.entries(x).forEach(([k,v])=>walk(v,path?path+' · '+k:k))}walk(m.contract,'Market');walk(m.metadata?.contractInfos,'Contracts');walk(m.metadata?.companyTokens,'Governance tokens');walk(m.metadata?.currencyTokens,'Collateral tokens');walk(m.resolution?.wrappedTokens,'Outcome token');walk(m.resolution?.questions?.map(q=>q.arbitrator),'Arbitrator');walk(m.token,'Underlying token');return [...found.values()]}
