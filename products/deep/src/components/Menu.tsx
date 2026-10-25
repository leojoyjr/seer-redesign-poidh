import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {Icon} from './Icon';
export function Menu({label,children,className='',testId}:{label:ReactNode;children:(close:()=>void)=>ReactNode;className?:string;testId?:string}){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),focusNext=useRef(false),pointer=useRef(false),pressedOpen=useRef(false),hoverOpen=useRef(false),armed=useRef(false);
 const items=()=>Array.from(panel.current?.querySelectorAll<HTMLElement>('[role=menuitem]:not(:disabled)')??[]);
 function close(){clearTimeout(timer.current);armed.current=false;hoverOpen.current=false;setOpen(false);}
 function show(){clearTimeout(timer.current);armed.current=false;document.dispatchEvent(new CustomEvent('deep-menu',{detail:root.current}));setOpen(true);}
 useEffect(()=>{
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))close();};
  const other=(e:Event)=>{if((e as CustomEvent).detail!==root.current)close();};
  document.addEventListener('pointerdown',outside);document.addEventListener('deep-menu',other);window.addEventListener('resize',close);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('deep-menu',other);window.removeEventListener('resize',close);clearTimeout(timer.current);};
 },[]);
 useEffect(()=>{
  if(!open)return;
  const escape=(e:KeyboardEvent)=>{if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();root.current?.querySelector('button')?.focus();close();};
  document.addEventListener('keydown',escape,true);
  return()=>document.removeEventListener('keydown',escape,true);
 },[open]);
 useLayoutEffect(()=>{
  if(!open||!panel.current||!root.current)return;
  const el=panel.current;el.style.transform='';el.style.top='calc(100% + 8px)';el.style.bottom='auto';el.style.maxHeight='';
  const r=el.getBoundingClientRect(),trigger=root.current.getBoundingClientRect();
  const dx=r.right>innerWidth-12?innerWidth-12-r.right:r.left<12?12-r.left:0;el.style.transform=`translateX(${dx}px)`;
  if(r.bottom>innerHeight-12&&trigger.top>r.height+20){el.style.top='auto';el.style.bottom='calc(100% + 8px)';el.style.maxHeight=`${trigger.top-20}px`;}
  else el.style.maxHeight=`${Math.max(100,innerHeight-trigger.bottom-20)}px`;
  if(focusNext.current){items()[0]?.focus();focusNext.current=false;}
 },[open]);
 return <div ref={root} className={`menu ${className}`} onPointerEnter={()=>clearTimeout(timer.current)}
  onPointerMove={e=>{if(e.pointerType!=='mouse'||open||armed.current)return;armed.current=true;timer.current=setTimeout(()=>{hoverOpen.current=true;show();},90);}}
  onPointerLeave={()=>{clearTimeout(timer.current);armed.current=false;timer.current=setTimeout(close,220);}}
  onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))close();}}
  onKeyDown={e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();root.current?.querySelector('button')?.focus();close();}
   if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!open){focusNext.current=true;show();return;}const all=items(),i=all.indexOf(document.activeElement as HTMLElement);all[(i+(e.key==='ArrowDown'?1:-1)+all.length)%all.length]?.focus();}
   if(e.key==='Home'&&open){e.preventDefault();items()[0]?.focus();}if(e.key==='End'&&open){e.preventDefault();items().at(-1)?.focus();}
   if(e.key.length===1&&open&&e.key!==' ')items().find(item=>item.textContent?.trim().toLowerCase().startsWith(e.key.toLowerCase()))?.focus();
  }}>
  <button data-testid={testId} className={`menu-trigger ${className==='wallet'?'btn-bubbles':''}`} aria-haspopup="menu" aria-expanded={open}
   onPointerDown={()=>{pointer.current=true;pressedOpen.current=open;clearTimeout(timer.current);}}
   onFocus={()=>{if(!pointer.current)show();}}
   onClick={()=>{pointer.current=false;if(hoverOpen.current){hoverOpen.current=false;show();}else pressedOpen.current?close():show();}}
   onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusNext.current=true;if(open)items()[0]?.focus();else show();}}}>
   {label}<Icon name="chevron" size={14}/>
  </button>
  {open&&<div ref={panel} data-testid={testId==='round-switcher'?'round-menu':testId==='wallet-button'?'wallet-menu':undefined} className="menu-content" role="menu" aria-label={typeof label==='string'?label:undefined} data-overlay>{children(close)}</div>}
 </div>;
}
