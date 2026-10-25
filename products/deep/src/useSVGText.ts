import {useLayoutEffect,useRef,useState} from 'react';
// Compensate SVG text for preserveAspectRatio's actual painted scale.
export function useSVGText(width:number,height:number){
 const ref=useRef<SVGSVGElement>(null),[size,setSize]=useState(12);
 useLayoutEffect(()=>{const svg=ref.current;if(!svg)return;const measure=()=>{const r=svg.getBoundingClientRect(),scale=Math.min(r.width/width,r.height/height);if(scale>0)setSize(Math.max(12,Math.min(48,11/scale)));};const observer=new ResizeObserver(measure);observer.observe(svg);measure();return()=>observer.disconnect();},[width,height]);
 return {ref,size};
}
