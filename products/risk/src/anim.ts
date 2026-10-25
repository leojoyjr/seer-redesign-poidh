import {useEffect,useRef,useState} from 'react';
export const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// Eased tween toward `target`: v(t) = from + (target - from) * (1 - (1-k)^3), k = elapsed/ms. Snaps under reduced motion.
export function useEased(target:number,ms=420,initial?:number){
 const [v,setV]=useState(initial??target);const cur=useRef(initial??target);
 useEffect(()=>{
  if(reduced()||cur.current===target){cur.current=target;setV(target);return}
  const from=cur.current,t0=performance.now();let raf=0;
  const step=(now:number)=>{const k=Math.min(1,(now-t0)/ms);cur.current=k===1?target:from+(target-from)*(1-(1-k)**3);setV(cur.current);if(k<1)raf=requestAnimationFrame(step)};
  raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf);
 },[target,ms]);
 return v;
}
