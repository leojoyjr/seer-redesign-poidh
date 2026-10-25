import {Icon} from './icons';
import { SeerFooter } from './SeerShell';
import {useEffect,useRef,useState} from 'react';
import {useRisk} from '../store';
import {help} from './links';
import {announceMenu,useExclusiveMenu} from './Menu';
export function Header(){const s=useRisk();const [open,setOpen]=useState(false);const menu=useRef<HTMLDivElement>(null);const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);useExclusiveMenu('help',()=>setOpen(false));
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!menu.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[]);
 return <header className="top sb sb-row"><Tabs/><span className="sp"/><button className="rv-btn rv-btn--ghost tb sb-btn" data-testid="btn-guide" onClick={()=>s.setModal('guide')}><Icon name="book"/><span>Quick guide</span></button><button className="rv-btn rv-btn--icon rv-btn--ghost tb icon sb-btn" data-testid="btn-email" aria-label="Email notifications" onClick={()=>s.setModal('email')}><Icon name="mail"/></button><div className="help-wrap" ref={menu} onPointerEnter={e=>{if(e.pointerType==='mouse'){clearTimeout(timer.current);timer.current=setTimeout(()=>{announceMenu('help');setOpen(true)},90)}}} onPointerLeave={e=>{if(e.pointerType==='mouse'){clearTimeout(timer.current);timer.current=setTimeout(()=>setOpen(false),220)}}}><button className="rv-btn rv-btn--icon rv-btn--ghost tb icon sb-btn" data-testid="btn-help" aria-label="Help" aria-expanded={open} aria-haspopup="menu" onFocus={e=>{if(e.currentTarget.matches(':focus-visible')){clearTimeout(timer.current);announceMenu('help');setOpen(true)}}} onClick={()=>{clearTimeout(timer.current);announceMenu('help');setOpen(v=>!v)}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setTimeout(()=>menu.current?.querySelector('a')?.focus(),0)}}}><Icon name="help"/></button>{open&&<div className="menu on" role="menu" onKeyDown={e=>{const links=Array.from(e.currentTarget.querySelectorAll('a'));const index=links.indexOf(document.activeElement as HTMLAnchorElement);if(e.key==='Escape'){setOpen(false);menu.current?.querySelector('button')?.focus();setOpen(false)}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();links[(index+(e.key==='ArrowDown'?1:-1)+links.length)%links.length].focus()}}}>{help.map(([label,url],i)=><a role="menuitem" data-testid={`help-item-${i+1}`} key={label} href={url} target="_blank" rel="noopener noreferrer" onClick={()=>setOpen(false)}>{label}<Icon name="arrow-up-right" size={14}/></a>)}</div>}</div></header>;
}
const sections=[['overview','Overview'],['assets','Assets'],['overtime','Over time'],['participate','Participate']] as const;
export function Tabs(){const s=useRisk();const [past,setPast]=useState(false);const [pulse,setPulse]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>{const on=()=>{const el=document.getElementById('assets');setPast(!!el&&el.getBoundingClientRect().top<window.innerHeight*.4)};on();window.addEventListener('scroll',on,{passive:true});window.addEventListener('resize',on);return()=>{window.removeEventListener('scroll',on);window.removeEventListener('resize',on);clearTimeout(timer.current)}},[]);
 const active=pulse?'participate':past?'assets':s.view==='time'?'overtime':'overview';
 function go(id:string){
  if(id==='overview'||id==='overtime'){s.setView(id==='overtime'?'time':'bars');window.scrollTo({top:0,behavior:'smooth'})}
  else if(id==='assets')document.getElementById('assets')?.scrollIntoView({block:'start',behavior:'smooth'});
  else{const el=document.getElementById('participate');el?.scrollIntoView({block:'nearest',behavior:'smooth'});el?.focus({preventScroll:true});el?.classList.remove('highlight');requestAnimationFrame(()=>el?.classList.add('highlight'));setPulse(true);clearTimeout(timer.current);timer.current=setTimeout(()=>setPulse(false),1400)}
 }
 return <nav className="tabs sb-tabs" aria-label="Sections">{sections.map(([id,label])=><button key={id} className="tab sb-tab" data-testid={`nav-${id}`} aria-current={active===id?'page':undefined} onClick={()=>go(id)}>{label}</button>)}</nav>}
export function Footer(){return <SeerFooter risk />;}
