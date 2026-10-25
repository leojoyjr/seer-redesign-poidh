import {useEffect,useRef,useState} from 'react';
import {assets,groups,names,type Group} from '../math/model';
import {useRisk} from '../store';
import {Icon,type IconName} from './icons';
import {Range,announceMenu,useExclusiveMenu} from './Menu';
const short:Record<Group,string>={all:'All',eth:'ETH',usd:'USD',btc:'BTC',funds:'Funds'};
export const groupShape:Record<Group,IconName>={all:'layers',eth:'diamond',usd:'circle',btc:'square',funds:'hexagon'};
export function Picker(){
 const s=useRisk(),[open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);useExclusiveMenu('assets',()=>setOpen(false));const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>{const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',close);return()=>{document.removeEventListener('pointerdown',close);clearTimeout(timer.current)}},[]);
 const selectGroup=(g:Group)=>{s.setAssetGroup(g);s.setSelected(assets.filter(a=>g==='all'||a.group===g).map(a=>a.id))};
 return <div className="filter-toolbar" aria-label="Filter assets">
  <div className="toolbar-lead"><div className="rv-seg group-segments" aria-label="Asset group">{groups.map(g=>{const list=assets.filter(a=>g==='all'||a.group===g);return <button className="rv-seg__item" key={g} title={names[g]} data-testid={`chip-${g}`} aria-pressed={s.selected.length===list.length&&list.every(a=>s.selected.includes(a.id))} onClick={()=>selectGroup(g)}><Icon name={groupShape[g]} size={14}/>{short[g]} <span>{list.length}</span></button>})}</div>
  <div className="asset-popover-anchor" ref={root} onPointerEnter={e=>{if(e.pointerType==='mouse'){clearTimeout(timer.current);timer.current=setTimeout(()=>{announceMenu('assets');setOpen(true)},90)}}} onPointerLeave={e=>{if(e.pointerType==='mouse'){clearTimeout(timer.current);timer.current=setTimeout(()=>setOpen(false),220)}}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus()}if(e.key==='ArrowDown'||e.key==='ArrowUp'){const buttons=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role=option]')??[]);if(!open){setOpen(true);return}const i=buttons.indexOf(document.activeElement as HTMLButtonElement);e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}}}>
   <button className="rv-btn rv-btn--secondary" aria-expanded={open} aria-haspopup="listbox" onFocus={e=>{if(e.currentTarget.matches(':focus-visible')){announceMenu('assets');setOpen(true)}}} onClick={()=>{clearTimeout(timer.current);announceMenu('assets');setOpen(v=>!v)}}><Icon name="filter" size={16}/>Assets <span className="rv-chip rv-chip--active">{s.selected.length}</span><Icon name="chevron-down" size={16} className="rv-menu__chev"/></button>
   {open&&<div className="asset-popover rv-card" data-overlay onFocus={()=>clearTimeout(timer.current)}>
    <div className="rv-search"><Icon name="search" size={16}/><input className="rv-input rv-input--search" aria-label="Search assets" placeholder="Search assets…" value={s.assetSearch} onChange={e=>s.setAssetSearch(e.target.value)}/></div>
    <div className="popover-actions"><span className="popover-count">{s.selected.length} of {assets.length} selected</span><button className="rv-btn rv-btn--ghost rv-btn--compact" data-testid="btn-clear-all" onClick={()=>s.setSelected(s.selected.length?[]:assets.map(a=>a.id))}>{s.selected.length?'Clear all':'Select all'}</button></div>
    <div className="popover-options" role="listbox" aria-label="Assets" aria-multiselectable="true">{groups.slice(1).map(g=><div key={g} role="group" aria-label={names[g]}><div className="popover-group"><Icon name={groupShape[g]} size={14}/>{names[g]}</div>{assets.filter(a=>a.group===g&&`${a.ticker} ${a.category}`.toLowerCase().includes(s.assetSearch.toLowerCase())).map(a=><button className={`asset-option ${s.selected.includes(a.id)?'is-on':''}`} role="option" aria-selected={s.selected.includes(a.id)} aria-pressed={s.selected.includes(a.id)} data-testid={`pill-${a.id}`} key={a.id} onClick={()=>s.toggle(a.id)} onDoubleClick={()=>s.setDrawer(a)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();s.setDrawer(a)}}}><span className="rv-check" aria-hidden="true">{s.selected.includes(a.id)&&<Icon name="check" size={14}/>}</span>{a.ticker}</button>)}</div>)}</div>
   </div>}
  </div>
  </div>
  <div className="toolbar-end"><div className="horizon-controls"><div className="rv-seg" aria-label="Horizon">{[25,100].map(h=><button className="rv-seg__item" key={h} aria-pressed={s.horizon===h} onClick={()=>s.setHorizon(h)}>{h===25?'Quart.':'Ann.'}</button>)}</div><Range data-testid="horizon-slider" min="25" max="100" value={s.horizon} aria-label="Horizon, Quart. to Ann." onChange={e=>s.setHorizon(Number(e.target.value))}/></div>
  <div className="rv-seg" aria-label="Chart view">{(['bars','time'] as const).map(v=><button className="rv-seg__item" key={v} data-testid={`view-${v}`} aria-pressed={s.view===v} onClick={()=>s.setView(v)}><Icon name={v==='bars'?'matrix':'line-chart'} size={16}/>{v==='bars'?'Rating matrix':'Over time'}</button>)}</div></div>
 </div>
}
