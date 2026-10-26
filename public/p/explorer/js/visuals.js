import {esc} from './ui.js';
import {percent,sentence} from './sentences.js';
const clamp=n=>Math.max(0,Math.min(100,n));
const value=n=>Number(n).toLocaleString('en',{maximumSignificantDigits:5});
export function visual(m){const p=m.pricing,k=p.kind,items=p.outcomes.filter(x=>Number.isFinite(x.p)),h=p.headline;let body='';
const bar=(x,max=1,label=x.name)=>`<div class="mini"><span>${esc(label)}</span><b>${k==='conditional'?value(x.p):percent(x.p)}</b><span class="mini-track" aria-hidden="true"><i style="width:${clamp(x.p/(max||1)*100)}%"></i></span></div>`;
if(!Number.isFinite(h.value))body=`<div class="unpriced-signal"><strong>${p.outcomes.length}</strong><span>possible answers</span><small>No quote supplied</small></div>`;
else if(k==='binary'){const yes=items.find(x=>/^yes$/i.test(x.name))||items[0];body=yes?`<div class="binary-label"><b>${percent(yes.p)}</b><span>${esc(yes.name)} · quoted chance</span></div><div class="split" aria-hidden="true"><i style="width:${clamp(yes.p*100)}%"></i></div>`:'<span class="muted">Quote unavailable</span>'}
else if(k==='categorical'||k==='field'){const ranked=[...items].sort((a,b)=>b.p-a.p),n=k==='field'?5:3;body=ranked.slice(0,n).map(x=>bar(x)).join('')+(items.length>n?`<small>${items.length-n} more answers</small>`:'')}
else if(k==='conditional'){const max=Math.max(...items.map(x=>x.p));body=`<div class="conditional-headline"><b>${h.value>0?'+':''}${h.value.toFixed(2)}%</b><span>pass versus fail</span></div>`+items.map((x,i)=>bar(x,max,i?'If it fails':'If it passes')).join('')}
else if(k==='scalar'){const lo=Number(p.lowerBound)/1e18,hi=Number(p.upperBound)/1e18,pos=hi>lo?(h.value-lo)/(hi-lo)*100:50;body=`<div class="scalar-headline"><b>${value(h.value)}</b><span>${esc(h.unit)}</span></div><div class="range" aria-hidden="true"><i style="left:${clamp(pos)}%"></i></div><div class="range-label"><span>${value(lo)}</span><span>${value(hi)}</span></div>`}
else if(k==='risk'){const v=h.value,band=v<2?0:v<5?1:v<10?2:3;body=`<div class="binary-label"><b>${v.toLocaleString('en',{maximumFractionDigits:3})}%</b><span>yearly default</span></div><div class="gauge" aria-hidden="true">${[0,1,2,3].map(i=>`<i class="${band===i?'on':''}"></i>`).join('')}</div><div class="range-label"><span>${['Low','Moderate','High','Critical'][band]} estimate</span><span>${esc(p.grade||'Annual horizon')}</span></div>`}
return `<div class="price-visual ${k}" data-product="${m.product}" role="img" aria-label="${esc(sentence(m).answer)}">${body}</div>`}
export function chart(m){const pts=(m.history||[]).filter(x=>Number.isFinite(x.values?.[0]));if(!pts.length)return '<p>No historical quotes supplied.</p>';const values=pts.map(p=>p.values[0]),min=Math.min(...values),max=Math.max(...values),span=max-min||1,d=values.map((v,i)=>`${i?'L':'M'}${12+i/Math.max(1,values.length-1)*376},${max===min?70:126-(v-min)/span*110}`).join(' ');return `<svg class="chart" viewBox="0 0 400 150" role="img" aria-label="${values.length} saved first-outcome observations"><path class="chart-axis" d="M12 140H388M12 70H388M12 12H388"/><path class="chart-line" d="${d}"/></svg><div class="range-label"><span>${new Date(pts[0].ts*1000).toLocaleDateString('en')}</span><span>${new Date(pts.at(-1).ts*1000).toLocaleDateString('en')}</span></div><p class="muted">${esc(m.historyNote||'Saved first-outcome quotes. Units may differ from the headline.')}</p><details><summary>Read ${pts.length} observations</summary><div class="data-scroll"><table><thead><tr><th>Date</th><th>Raw quote</th></tr></thead><tbody>${pts.map(p=>`<tr><td>${new Date(p.ts*1000).toLocaleDateString('en')}</td><td>${p.values[0]}</td></tr>`).join('')}</tbody></table></div></details>`}
export function animateVisuals(root=document){if(!window.gsap||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const bars=root.querySelectorAll('.price-visual .mini-track i,.price-visual .split>i,.price-visual .gauge>i');if(bars.length){gsap.killTweensOf(bars);gsap.fromTo(bars,{scaleX:0},{scaleX:1,transformOrigin:'left',stagger:.045,duration:.65,ease:'power4.out',clearProps:'transform'});}}

// Shared image treatments use only captured assets; missing media shows an identity monogram.
export function marketImage(m, treatment='thumb') {
 const initials=String(m.title||m.product||'').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
 const src=typeof m.image==='string'&&/^(assets\/|https:\/\/)/.test(m.image)?m.image:null;
 return `<span class="market-media market-media-${esc(treatment)}" aria-hidden="true"><span>${esc(initials)}</span>${src?`<img src="${esc(src)}" alt="" loading="lazy" decoding="async" width="56" height="56" onerror="this.hidden=true">`:''}${treatment==='thumb'&&m.asker?`<span class="market-asker-badge">${askerAvatar(m.asker)}</span>`:''}</span>`;
}
export function askerAvatar(a) {
 const label=String(a.name||a.id||'');
 const key=Object.entries({ethereum:'ethereum',optimism:'optimism',gnosis:'gnosis',kleros:'kleros',gitcoin:'gitcoin',bankless:'bankless',a16z:'a16z'}).find(([name])=>label.toLowerCase().includes(name))?.[1];
 const initials=/^0x/i.test(label)?label.slice(2,4):label.split(/\s+/).slice(0,2).map(w=>w[0]||'').join('');
 return `<span class="avatar inner-avatar" aria-hidden="true"><span>${esc(initials.toUpperCase())}</span>${key?`<img src="assets/user/asker-${key}.png" width="40" height="40" alt="" loading="lazy" decoding="async" onerror="this.hidden=true">`:''}</span>`;
}
export function productMark(id){return ['seer','deep','futarchy','opportunity','risk'].includes(id)?`<span class="inner-product-mark" style="--product-icon:url('${new URL('../assets/user/icon-'+id+'.svg',import.meta.url).href}')" aria-hidden="true"></span>`:''}
