import {ledger,products} from './store.js';
import {esc} from './ui.js';
export function enrichResults(container,query){
 for(const a of container.querySelectorAll('a[href^="#/m/"]')){
  const id=decodeURIComponent(a.getAttribute('href').slice(5).split('?')[0]),m=ledger.find(m=>m.id===id);if(!m)continue;
  const title=m.title,at=title.toLowerCase().indexOf(query.toLowerCase()),h=m.pricing.headline;
  const text=at<0||!query?esc(title):esc(title.slice(0,at))+'<mark>'+esc(title.slice(at,at+query.length))+'</mark>'+esc(title.slice(at+query.length));
  const value=h.value==null?'Unquoted':new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(['probability','share'].includes(h.unit)?h.value*100:h.value)+(['probability','share','%'].includes(h.unit)?'%':'');
  a.innerHTML=`<span class="suggestion-title">${text}</span><span class="suggestion-product">${products[m.product].name}</span><b class="suggestion-quote">${esc(value)}</b>`;
 }
}
let closeCurrent=()=>{};
export function closeSearch(){closeCurrent()}
export function bindSuggestions(input,results,render){
 closeCurrent();document.querySelectorAll('.suggestion-portal').forEach(x=>x.remove());
 if(!results){results=document.createElement('div');results.className='search-results'}
 const inDialog=!!input.closest('dialog');if(!inDialog){document.body.append(results);results.classList.add('suggestion-portal')}
 results.setAttribute('role','listbox');input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');
 const controller=new AbortController(),signal=controller.signal;let selected=-1;
 const position=()=>{if(inDialog)return;const r=(input.closest('.d4-search.big,.search-wrap')||input).getBoundingClientRect();results.style.left=r.left+'px';results.style.top=r.bottom+8+'px';results.style.width=r.width+'px';results.style.maxHeight=Math.max(80,Math.min(380,innerHeight-r.bottom-20))+'px'};
 const close=()=>{results.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');document.body.classList.remove('suggestions-open')};
 closeCurrent=()=>{close();controller.abort();if(!inDialog)results.remove()};
 const choose=i=>{const items=[...results.querySelectorAll('a')];if(!items.length)return;selected=(i+items.length)%items.length;items.forEach((a,j)=>{a.id='suggestion-'+j;a.setAttribute('aria-selected',String(j===selected))});input.setAttribute('aria-activedescendant',items[selected].id);items[selected].scrollIntoView({block:'nearest'})};
 const show=()=>{render(input.value,results);enrichResults(results,input.value);selected=-1;position();results.hidden=false;input.setAttribute('aria-expanded','true');document.body.classList.add('suggestions-open')};
 input.oninput=show;input.onfocus=show;input.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(results.hidden)show();choose(selected+(e.key==='ArrowDown'?1:-1))}if(e.key==='Escape'){e.preventDefault();close()}if(e.key==='Enter'){const a=results.querySelectorAll('a')[Math.max(0,selected)];if(a){e.preventDefault();a.click();close();input.closest('dialog')?.close()}}};
 results.onpointermove=e=>{const a=e.target.closest('a');if(a)choose([...results.querySelectorAll('a')].indexOf(a))};
 results.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();choose(selected+(e.key==='ArrowDown'?1:-1));results.querySelectorAll('a')[selected]?.focus()}if(e.key==='Escape'){e.preventDefault();input.focus();close()}};
 results.onclick=()=>{if(results.contains(document.activeElement))input.focus();close();input.closest('dialog')?.close()};
 document.addEventListener('pointerdown',e=>{if(!results.contains(e.target)&&e.target!==input&&!e.target.closest('[data-hero-search]'))close()},{signal});
 addEventListener('resize',position,{signal});document.addEventListener('scroll',position,{capture:true,passive:true,signal});
}
