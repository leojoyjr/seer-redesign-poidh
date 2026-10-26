export const percent=n=>n==null?'Quote unavailable':(n*100).toLocaleString('en',{maximumFractionDigits:1})+'%';
// The same four-part sentence is used by the index, details, search and explanations.
export function sentence(m){const h=m.pricing.headline,v=h.value,k=m.pricing.kind;
const action={binary:'Check against your own view',categorical:'Compare the leading answers',scalar:'Plan around this estimate',conditional:'Weigh it before the vote',field:m.product==='deep'?'Compare original work':'Shortlist the leading entries',risk:'Compare before you lend'}[k]||'Inspect the evidence';
let answer;if(!Number.isFinite(v))answer='A quote is not supplied in this snapshot.';
else if(k==='conditional')answer=v===0?'Pass and fail are priced equally. Voters decide.':`Passing is priced ${Math.abs(v).toFixed(2)}% ${v>0?'above':'below'} failing. Voters decide.`;
else if(k==='risk')answer=`${v.toLocaleString('en',{maximumFractionDigits:3})}% estimated yearly chance of default.`;
else if(k==='scalar')answer=`The crowd estimates ${v.toLocaleString('en',{maximumFractionDigits:2})} ${h.unit}.`;
else if(k==='field'&&m.product==='deep')answer=`${percent(v)} priced as original work, not selection odds.`;
else if(k==='binary')answer=`Traders price ${h.label.trim()} at a ${percent(v)} chance.`;
else answer=`${h.label.trim()} leads at ${percent(v)}${h.unit==='share'?' of the share':''}.`;
return {asker:`${m.asker.name} asks`,question:m.title.trim(),answer,action,reason:m.useIt.sentence};}
