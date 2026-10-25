import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
export function Tooltip({text,children}:{text:string;children:React.ReactNode}){
 const id=useId(),ref=useRef<HTMLSpanElement>(null),popup=useRef<HTMLSpanElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),[open,setOpen]=useState(false),[point,setPoint]=useState({left:8,top:8}),[placed,setPlaced]=useState(false);
 const hide=()=>{clearTimeout(timer.current);setOpen(false);setPlaced(false);};
 const show=()=>{clearTimeout(timer.current);timer.current=setTimeout(()=>setOpen(true),300);};
 const leave=(event:{relatedTarget:EventTarget|null})=>{const owner=ref.current?.closest('button')??ref.current;if(event.relatedTarget instanceof Node&&owner?.contains(event.relatedTarget))return;hide();};
 // A nested label also describes its owning control when that control receives focus.
 useEffect(()=>{
  const owner=ref.current?.closest('button');if(!owner)return;
  owner.addEventListener('focus',show);owner.addEventListener('blur',hide);
  owner.addEventListener('pointerenter',show);owner.addEventListener('pointerleave',hide);
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')hide();};
  owner.addEventListener('keydown',escape);
  return()=>{owner.removeEventListener('focus',show);owner.removeEventListener('blur',hide);owner.removeEventListener('pointerenter',show);owner.removeEventListener('pointerleave',hide);owner.removeEventListener('keydown',escape);};
 },[]);
 useEffect(()=>{
  const owner=ref.current?.closest('button');if(!owner||!open)return;
  const previous=owner.getAttribute('aria-describedby');
  owner.setAttribute('aria-describedby',[previous,id].filter(Boolean).join(' '));
  return()=>{if(previous===null)owner.removeAttribute('aria-describedby');else owner.setAttribute('aria-describedby',previous);};
 },[open,id]);
 useLayoutEffect(()=>{
  if(!open||!ref.current||!popup.current)return;
  const place=()=>{if(!ref.current||!popup.current)return;const r=ref.current.getBoundingClientRect(),tip=popup.current.getBoundingClientRect(),gap=8;
  const below=r.bottom+gap+tip.height<=innerHeight-gap;
  setPoint({left:Math.max(gap,Math.min(r.left+(r.width-tip.width)/2,innerWidth-tip.width-gap)),top:below?r.bottom+gap:Math.max(gap,r.top-tip.height-gap)});setPlaced(true);};place();window.addEventListener('scroll',place,true);return()=>window.removeEventListener('scroll',place,true);
 },[open,text]);
 useEffect(()=>{
  // Scrolling a hovered control into view must not cancel its pending hint.
  const scroll=()=>{const anchor=ref.current;if(!anchor)return;const r=anchor.getBoundingClientRect();let left=Math.max(0,r.left),right=Math.min(innerWidth,r.right),top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);for(let parent=anchor.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent),box=parent.getBoundingClientRect();if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,box.left);right=Math.min(right,box.right);}if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,box.top);bottom=Math.min(bottom,box.bottom);}}if(right<=left||bottom<=top)hide();};
  window.addEventListener('scroll',scroll,true);window.addEventListener('resize',hide);return()=>{clearTimeout(timer.current);window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',hide);};
 },[]);
 return <span className="tooltip-anchor" ref={ref} tabIndex={0} aria-describedby={open?id:undefined} onFocus={show} onBlur={leave} onPointerEnter={show} onPointerLeave={leave} onKeyDown={e=>{if(e.key==='Escape')hide();}}>{children}{open&&createPortal(<span ref={popup} className="tooltip" role="tooltip" id={id} style={{...point,visibility:placed?'visible':'hidden'}}>{text}</span>,ref.current?.closest('dialog')??document.body)}</span>;
}
