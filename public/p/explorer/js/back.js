import {esc} from './ui.js';
// Mark entries individually: reloads retain the predecessor, direct arrivals stay local.
let current=location.href;
const marker='seerExplorerEntry';
function mark(previous=null){history.replaceState({...history.state,[marker]:{url:location.href,previous}},'')}
if(!history.state?.[marker])mark();
addEventListener('hashchange',e=>{const old=new URL(e.oldURL);const local=old.origin===location.origin&&old.pathname===location.pathname&&old.hash.startsWith('#/');if(history.state?.[marker]?.url!==location.href)mark(local?current:null);current=location.href});
function goBack(){const previous=history.state?.[marker]?.previous;if(previous){const url=new URL(previous);if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash.startsWith('#/')){history.back();return}}location.hash='#/'}
export function mountBack(main,path){if(path==='/')return;const heading=main.querySelector('h1,h2');const tail=heading?.textContent||path.split('/')[1];const nav=document.createElement('nav');nav.className='a6-back-row';nav.setAttribute('aria-label','Back to Explorer');nav.innerHTML=`<a class="a6-back" href="#/"><span class="a6-back-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m14 6-6 6 6 6"/></svg></span><span>Explorer</span></a><span class="a6-back-tail">/ ${esc(tail)}</span>`;nav.querySelector('a').addEventListener('click',e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();goBack()});main.prepend(nav)}
// Capture before other Escape handlers dismiss a menu or preview.
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||e.defaultPrevented||!document.querySelector('.a6-back'))return;const visible=el=>!el.hidden&&el.getClientRects().length>0;if(document.querySelector('dialog[open],details.menu[open], [role="menu"]:not([hidden]),[aria-expanded="true"]')||[...document.querySelectorAll('#peek,.suggestion-portal')].some(visible))return;if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;e.preventDefault();goBack()},true);
