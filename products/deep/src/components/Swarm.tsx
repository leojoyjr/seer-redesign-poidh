import { useEffect, useRef, useState } from 'react';
import {useThemePaint} from '../useThemePaint';
import { Delaunay } from 'd3-delaunay';
import type { Market } from '../data/types';
import { series } from '../data/series';
import { layout, lens, splitOrigins, type Dot } from '../math/swarm';
import { updateQuery } from '../router';
import { Inspector } from './Inspector';
import { ReplayStrip, type ReplayControls } from './ReplayStrip';
type Props={ markets:Market[]; params:URLSearchParams; hidden:boolean; predictions:Record<string,number> } & ReplayControls;
export function Swarm({markets,params,hidden,predictions,t,playing,togglePlay,scrub,speed,setSpeed,loop,setLoop}:Props){
  const theme=useThemePaint();
  const [layer,setLayer]=useState('UP price');
  const canvas=useRef<HTMLCanvasElement>(null), dots=useRef<Dot[]>([]), picking=useRef<Delaunay<Dot>|null>(null), cache=useRef('');
  const q=params.get('q')??'', iso=params.get('iso');
  useEffect(()=>{
    const el=canvas.current!, parent=el.parentElement!, reduced=matchMedia('(prefers-reduced-motion: reduce)');let raf=0, visible=true, first=true;
    const draw=()=>{
      cancelAnimationFrame(raf);if(!visible)return;
      const w=el.clientWidth,h=Math.max(180,el.clientHeight),vertical=false,dpr=Math.min(devicePixelRatio,2),css=getComputedStyle(el),color=(key:string)=>css.getPropertyValue(key).trim();
      el.width=w*dpr;el.height=h*dpr;
      const before=dots.current;const key=`${w}:${h}:`+markets.map(m=>`${m.up}:${m.liqTok}`).join(',');const target=key===cache.current?before:layout(markets,w,h,vertical,before);cache.current=key;dots.current=target;
      const start=performance.now(), morph=first&&!reduced.matches;first=false;
      const paint=(now:number)=>{
        const c=el.getContext('2d')!;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.font='12px sans-serif';
        const labels:{x:number;y:number;width:number;height:number;text:string}[]=[];
        const label=(text:string,x:number,y:number,fill=color('--text-2'))=>{c.save();c.setLineDash([]);c.font='12px sans-serif';const width=c.measureText(text).width;if(width>w-24){c.restore();return;}x=Math.max(12,Math.min(w-width-12,x));y=Math.max(24,Math.min(h-8,y));if(labels.some(b=>x<b.x+b.width+4&&x+width+4>b.x&&y-12<b.y+b.height+4&&y+6>b.y)){c.restore();return;}c.lineWidth=4;c.strokeStyle=color('--card');c.strokeText(text,x,y);c.fillStyle=fill;c.fillText(text,x,y);labels.push({text,x,y:y-12,width:c.measureText(text).width,height:14});c.restore();};
        const axis=(v:number)=>40+lens(v)*((vertical?h:w)-80);
        c.fillStyle=color('--nested');if(vertical)c.fillRect(24,axis(.65),w-48,axis(.85)-axis(.65));else c.fillRect(axis(.65),24,axis(.85)-axis(.65),h-64);
        c.save();c.fillStyle=color('--track');c.font=`${vertical?48:Math.min(100,w*.15)}px sans-serif`;c.textAlign='center';c.fillText(`OCT ${new Date(t*1000).getUTCDate()}`,w/2,h*.63);c.restore();
        const median=[...markets].sort((a,b)=>a.up-b.up);const med=(median[48].up+median[49].up)/2;
        c.strokeStyle=color('--median');c.setLineDash([2,4]);c.beginPath();if(vertical){c.moveTo(24,axis(med));c.lineTo(w-24,axis(med));}else{c.moveTo(axis(med),36);c.lineTo(axis(med),h-52);}c.stroke();c.setLineDash([]);
        label(`median ${med.toFixed(3)}`,vertical?32:Math.min(w-110,axis(med)+6),vertical?axis(med)-12:48,color('--median'));
        for(let i=0;i<=9;i++){const v=.5+i*.05,p=axis(v);c.strokeStyle=color('--line');c.beginPath();if(vertical){c.moveTo(20,p);c.lineTo(28,p);}else{c.moveTo(p,h-36);c.lineTo(p,h-30);}c.stroke();label(v.toFixed(2),vertical?32:p-14,vertical?p+4:h-12);}
        const f=morph?Math.min(1,(now-start)/420):1;
        const positions=target.map((d,i)=>{const old=before.find(p=>p.market.id===d.market.id);const captured=splitOrigins.get(d.market.id),rect=el.getBoundingClientRect();const origin=old??(captured?{x:captured.x-rect.left,y:captured.y-rect.top}:{x:40+d.market.up*(w-80),y:Math.min(h-60,72+i*3)});return {...d,x:origin.x+(d.x-origin.x)*f,y:origin.y+(d.y-origin.y)*f};});
        c.save();c.beginPath();c.rect(12,24,w-24,h-64);c.clip();
        if(!hidden)for(const d of positions){if(!d.market.name.toLowerCase().includes(q.toLowerCase()))continue;const selected=d.market.id===iso,firstPrice=series[d.market.id].up[0].value;
          c.globalAlpha=iso&&!selected ? .22 : .8;c.strokeStyle=color(d.market.up>=firstPrice?'--green':'--red');c.beginPath();c.moveTo(vertical?d.x:axis(firstPrice),vertical?axis(firstPrice):d.y);c.lineTo(d.x,d.y);c.stroke();
          const pred=predictions[d.market.id];if(pred!==undefined){const px=vertical?d.x:axis(pred),py=vertical?axis(pred):d.y;c.strokeStyle=color('--violet');c.beginPath();c.moveTo(d.x,d.y);c.lineTo(px,py);c.stroke();c.beginPath();c.arc(px,py,d.r+3,0,Math.PI*2);c.stroke();}
          c.fillStyle=color(selected?'--text':layer==='Unpriced gap'?(d.market.residual<0?'--red':'--amber'):layer==='Drift since first trade'?(d.market.up>=firstPrice?'--green':'--red'):'--series-up');c.beginPath();const radius=layer==='Volume'?4+12*Math.sqrt(d.market.volTok/Math.max(...markets.map(m=>m.volTok),1)):layer==='Your predictions'?(pred===undefined?2:d.r):d.r;c.arc(d.x,d.y,radius,0,Math.PI*2);c.fill();if(selected){c.strokeStyle=color('--violet');c.lineWidth=2;c.beginPath();c.arc(d.x,d.y,d.r+4,0,Math.PI*2);c.stroke();c.lineWidth=1;}}
        c.restore();c.globalAlpha=1;
        const sorted=[...positions].filter(d=>d.market.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.market.up-b.market.up);
        const chosen=[...new Map([...sorted.slice(0,3),...sorted.slice(-3),...positions.filter(d=>d.market.id===iso)].map(d=>[d.market.id,d])).values()];
        let last=vertical?64:Math.max(76,h*.5-100);
        if(!hidden)chosen.sort((a,b)=>a.y-b.y).forEach((d,index)=>{const text=`${d.market.repo} ${d.market.up.toFixed(4)}`,tw=c.measureText(text).width,x=vertical?Math.max(60,Math.min(w-tw-12,d.x+12)):Math.max(12,Math.min(w-tw-12,d.x+16)),y=Math.max(last+18,Math.min(h-64-(chosen.length-1-index)*18,d.y-16));last=y;c.strokeStyle=color('--series-down');c.beginPath();c.moveTo(d.x,d.y);c.lineTo(x,y+4);c.stroke();label(text,x,y);});
        (el as HTMLCanvasElement & {__labels:typeof labels}).__labels=labels;(el as HTMLCanvasElement & {__series:{id:string;alpha:number}[]}).__series=positions.filter(d=>d.market.name.toLowerCase().includes(q.toLowerCase())).map(d=>({id:d.market.id,alpha:hidden?0:iso?(d.market.id===iso?1:.22):1}));picking.current=Delaunay.from(positions,d=>d.x,d=>d.y);
        if(f<1)raf=requestAnimationFrame(paint);
      };paint(performance.now());
    };
    const resize=new ResizeObserver(draw);resize.observe(parent);const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)draw();else cancelAnimationFrame(raf);});observer.observe(el);draw();return()=>{resize.disconnect();observer.disconnect();cancelAnimationFrame(raf);};
  },[markets,q,iso,hidden,predictions,t,layer,theme]);
  const selected=markets.find(m=>m.id===iso);
  return <><p className="swarm-lens">Lens ×3.3 on 0.65–0.85 · 91 of 98 repositories</p><div className="swarm-field"><div className="swarm-layers">{['UP price','Unpriced gap','Drift since first trade','Volume','Your predictions'].map(v=><button key={v} aria-pressed={layer===v} aria-current={layer===v?'true':undefined} disabled={v==='Your predictions'&&!Object.keys(predictions).length} title={v==='Your predictions'&&!Object.keys(predictions).length?'Upload predictions in the Desk first':layer===v?'Current':v} onClick={()=>setLayer(v)}>{v}</button>)}<button onClick={()=>updateQuery({view:'split'})}>Time chart</button></div><canvas data-testid="swarm-canvas" ref={canvas} tabIndex={0} aria-label="98 repositories on an exact UP axis; the ranked repository table is the keyboard-accessible data fallback" role="img" onPointerMove={e=>{if(hidden)return;const r=e.currentTarget.getBoundingClientRect(),i=picking.current?.find(e.clientX-r.left,e.clientY-r.top);if(i!==undefined)updateQuery({iso:dots.current[i].market.id},true);}} onPointerDown={e=>{if(hidden)return;const r=e.currentTarget.getBoundingClientRect(),i=picking.current?.find(e.clientX-r.left,e.clientY-r.top);if(i!==undefined){e.currentTarget.setAttribute('data-select-repo',dots.current[i].market.id);updateQuery({iso:dots.current[i].market.id},true);}}}/>{selected&&!hidden&&<aside className="swarm-inspector" data-overlay><Inspector market={selected}/></aside>}</div><p className="swarm-axis-caption">UP price · market estimate of the share of original work → <span>dot size = liquidity · tail = UP on Oct 1</span></p><ReplayStrip t={t} playing={playing} togglePlay={togglePlay} scrub={scrub} speed={speed} setSpeed={setSpeed} loop={loop} setLoop={setLoop}/></>;
}
