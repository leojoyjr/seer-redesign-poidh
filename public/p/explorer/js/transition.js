import {closeSearch} from './search.js';
let source=null,command=null,timeline=null,ghosts=[];
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function snapshot(el,text){if(!el)return null;const rect=el.getBoundingClientRect(),css=getComputedStyle(el);return {rect,text:text||el.value||el.textContent,font:css.fontSize,weight:css.fontWeight,color:css.color}}
function cleanup(){timeline?.kill();timeline=null;ghosts.forEach(el=>el.remove());ghosts=[];document.querySelectorAll('[data-transition-hidden]').forEach(el=>{el.style.removeProperty('visibility');delete el.dataset.transitionHidden});window.seerTransitioning=false}
function ghost(data){const el=document.createElement('div');el.className='question-flight';el.textContent=data.text;Object.assign(el.style,{left:data.rect.left+'px',top:data.rect.top+'px',width:data.rect.width+'px',height:data.rect.height+'px',fontSize:data.font,fontWeight:data.weight,color:data.color});document.body.append(el);ghosts.push(el);return el}
function capture(e){const el=e.target.closest('a[href^="#/m/"],[data-open],[data-market-open],.market-row');if(!el)return;const title=el.querySelector('.suggestion-title,.d4-q,h3,.question a,td.q a,td:first-child')||el;source=snapshot(title);if(source){const price=el.closest('.d4-tile,.market-row,.live-card')?.querySelector('.d4-vis strong,.price-visual b,.large-quote strong');source.quote=parseFloat(price?.textContent.replace(/,/g,''))}command=snapshot(document.querySelector('#omnibox,#inner-command-input'));}
document.addEventListener('click',capture,true);
document.addEventListener('keydown',e=>{if(e.key==='Enter')capture(e)},true);
export function transition(render,from,to){
 cleanup();const entering=to.startsWith('/m/')&&from!==to,leaving=from?.startsWith('/m/')&&!to.startsWith('/m/');
 if(!entering&&!leaving||reduced()||!window.gsap){closeSearch();render();source=null;command=null;return}
 window.seerTransitioning=true;
 if(leaving){source=snapshot(document.querySelector('.market-heading h1'));command=snapshot(document.querySelector('.market-command'))}
 const old=document.querySelector('#main')?.cloneNode(true);if(old){old.id='departing-page';old.inert=true;old.setAttribute('aria-hidden','true');Object.assign(old.style,{position:'fixed',left:'0',top:-scrollY+'px',width:'100%',pointerEvents:'none',zIndex:'150'});document.body.append(old);ghosts.push(old)}
 const textSource=source,barSource=command;closeSearch();try{render()}catch(e){cleanup();throw e}window.scrollTo({top:0,behavior:'instant'});
 const target=entering?document.querySelector('.market-heading h1'):document.querySelector('#omnibox');
 if(leaving&&target&&barSource?.text)target.value=barSource.text;
 const g=window.gsap;timeline=g.timeline({onComplete:cleanup});setTimeout(cleanup,1800);
 if(old)timeline.to(old,{opacity:0,y:leaving?12:-12,duration:.18,ease:'power2.out'},0);
 if(textSource&&target){const fly=ghost(textSource),r=target.getBoundingClientRect(),css=getComputedStyle(target);target.dataset.transitionHidden='';target.style.visibility='hidden';
  if(window.Flip){g.registerPlugin(Flip);const state=Flip.getState(fly);Object.assign(fly.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',fontSize:css.fontSize,fontWeight:css.fontWeight});timeline.add(Flip.from(state,{duration:leaving?.28:.46,ease:'power3.inOut',scale:true,absolute:true}),0)}else timeline.to(fly,{x:r.left-textSource.rect.left,y:r.top-textSource.rect.top,scale:parseFloat(css.fontSize)/parseFloat(textSource.font),transformOrigin:'top left',duration:.46,ease:'power3.inOut'},0);
 }
 const bar=document.querySelector('.market-command');if(entering&&bar){bar.value=barSource?.text||textSource?.text||'';if(barSource){const fly=ghost(barSource),r=bar.getBoundingClientRect();fly.classList.add('command-flight');timeline.to(fly,{x:r.left-barSource.rect.left,y:r.top-barSource.rect.top,scaleX:r.width/barSource.rect.width,scaleY:r.height/barSource.rect.height,transformOrigin:'top left',opacity:0,duration:.42,ease:'power3.inOut'},0)}}
 if(entering){const ticket=document.querySelector('.trade-ticket');if(ticket)timeline.fromTo(ticket,{opacity:0,x:24,scaleY:.92,transformOrigin:'top right'},{opacity:1,x:0,scaleY:1,duration:.32,clearProps:'transform,opacity'},.20);
 document.querySelectorAll('.chart-line').forEach(path=>{const length=path.getTotalLength();timeline.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{strokeDashoffset:0,duration:.36,clearProps:'strokeDasharray,strokeDashoffset'},.16)});
 const value=document.querySelector('.ribbon-signal .binary-label b,.ribbon-signal .conditional-headline b,.ribbon-signal .scalar-headline b');if(value){const original=value.textContent,end=parseFloat(original.replace(/,/g,'')),start=Number.isFinite(textSource?.quote)?textSource.quote:end;if(Number.isFinite(end)){const state={v:start};timeline.to(state,{v:end,duration:.35,onUpdate:()=>{value.textContent=state.v.toFixed(1)+(original.includes('%')?'%':'')},onComplete:()=>{value.textContent=original}},.15)}}
 }else{const hero=document.querySelector('.d4-hero');if(hero)timeline.fromTo(hero,{opacity:.4,y:12},{opacity:1,y:0,duration:.28,clearProps:'opacity,transform'},0)}
 timeline.to({}, {duration:.01},leaving?.3:.55);source=null;command=null;
}
