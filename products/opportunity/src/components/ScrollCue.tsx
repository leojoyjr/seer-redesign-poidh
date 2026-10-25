import {useEffect,useRef,useState} from 'react';
/** Measures the actual bounded viewport, including virtual table spacer rows. */
export function ScrollCue({children,rowHeight=40}:{children:React.ReactNode;rowHeight?:number}){
 const ref=useRef<HTMLDivElement>(null),[more,setMore]=useState(0);
 useEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setMore(Math.max(0,Math.ceil((el.scrollHeight-el.clientHeight-el.scrollTop)/rowHeight)));const resize=new ResizeObserver(measure),mutation=new MutationObserver(measure);resize.observe(el);mutation.observe(el,{childList:true,subtree:true});el.addEventListener('scroll',measure);measure();return()=>{resize.disconnect();mutation.disconnect();el.removeEventListener('scroll',measure);};},[rowHeight]);
 return <div className="bounded-list"><div ref={ref} className={`scroll-pane ${more?'has-more':''}`}>{children}</div>{more>0&&<div className="scroll-cue" role="status">↓ {more} more</div>}</div>;
}
