import {useEffect,useId,useRef,useState,type InputHTMLAttributes,type CSSProperties} from 'react';
import {Icon,type IconName} from './icons';
/** One open menu at a time: opening any menu broadcasts, every other menu closes itself. */
export function announceMenu(id:string){window.dispatchEvent(new CustomEvent('rv:menu',{detail:id}))}
export function useExclusiveMenu(id:string,close:()=>void){useEffect(()=>{const on=(e:Event)=>{if((e as CustomEvent).detail!==id)close()};window.addEventListener('rv:menu',on);return()=>window.removeEventListener('rv:menu',on)})}
export type Option={value:string;label:string};
export function Select({value,options,onChange,label,prefix,icon,testid}:{value:string;options:Option[];onChange:(v:string)=>void;label:string;prefix?:string;icon?:IconName;testid?:string}){
 const id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),type=useRef({text:'',t:0});
 const [open,setOpen]=useState(false),[up,setUp]=useState(false),[cursor,setCursor]=useState(0);
 const current=options.find(o=>o.value===value)??options[0];
 useExclusiveMenu(id,()=>setOpen(false));
 useEffect(()=>{if(!open)return;const out=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',out);return()=>document.removeEventListener('pointerdown',out)},[open]);
 useEffect(()=>{if(!open||!root.current)return;const panel=root.current.querySelector<HTMLElement>('.rv-menu__panel');if(!panel)return;const r=trigger.current!.getBoundingClientRect();setUp(window.innerHeight-r.bottom<panel.offsetHeight+16&&r.top>panel.offsetHeight+16);panel.querySelectorAll<HTMLElement>('[role=option]')[cursor]?.focus({preventScroll:false})},[open,cursor]);
 const show=()=>{announceMenu(id);setCursor(Math.max(0,options.findIndex(o=>o.value===value)));setOpen(true)};
 const close=(focus=true)=>{setOpen(false);if(focus)trigger.current?.focus()};
 const pick=(o:Option)=>{onChange(o.value);close()};
 const key=(e:React.KeyboardEvent)=>{
  if(!open){if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();show()}return}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}
  else if(e.key==='ArrowDown'){e.preventDefault();setCursor(c=>(c+1)%options.length)}
  else if(e.key==='ArrowUp'){e.preventDefault();setCursor(c=>(c-1+options.length)%options.length)}
  else if(e.key==='Home'){e.preventDefault();setCursor(0)}
  else if(e.key==='End'){e.preventDefault();setCursor(options.length-1)}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(options[cursor])}
  else if(e.key==='Tab')setOpen(false);
  else if(e.key.length===1&&!e.metaKey&&!e.ctrlKey){const t=type.current,now=Date.now();t.text=now-t.t>600?e.key.toLowerCase():t.text+e.key.toLowerCase();t.t=now;const i=options.findIndex(o=>o.label.toLowerCase().startsWith(t.text));if(i>=0)setCursor(i)}
 };
 return <div className="rv-menu" ref={root} onKeyDown={key}>
  <button ref={trigger} type="button" className="rv-btn rv-btn--secondary rv-menu__trigger" data-testid={testid} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current.label}`} onClick={()=>open?close(false):show()}>{icon&&<Icon name={icon} size={16}/>}<span className="rv-menu__value">{prefix&&<span className="rv-menu__prefix">{prefix}</span>}{current.label}</span><Icon name="chevron-down" size={16} className="rv-menu__chev"/></button>
  {open&&<div className="rv-menu__panel rv-card" data-up={up} role="listbox" aria-label={label} data-overlay>{options.map((o,i)=><button type="button" key={o.value} role="option" aria-selected={o.value===value} tabIndex={-1} className="rv-menu__item" data-cursor={i===cursor} onMouseEnter={()=>setCursor(i)} onClick={()=>pick(o)}><span>{o.label}</span>{o.value===value&&<Icon name="check" size={16}/>}</button>)}</div>}
 </div>;
}
/** Range slider whose filled portion follows the value (all sliders share .rv-range). */
export function Range(props:InputHTMLAttributes<HTMLInputElement>){
 const min=Number(props.min??0),max=Number(props.max??100),v=Number(props.value??0),at=max>min?Math.max(0,Math.min(100,(v-min)/(max-min)*100)):0;
 return <input {...props} type="range" className={`rv-range ${props.className??''}`} style={{'--v':`${at}%`} as CSSProperties}/>;
}
