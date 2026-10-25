import {useLayoutEffect,useRef,useState} from 'react';
import {motion,useReducedMotion} from 'motion/react';
const steps=[['.desktop-rail .rail, .mobile-market-selector','Markets','Explore active and completed markets.'],['.marquee','Live markets','Select a market to enter.'],['.ranked-ladder, .field, .ranked-pane','Odds','Odds show traders’ estimates of selection.'],['.cut-row, .mobile-ticket-trigger','Review cut','Review cut highlights top submissions; it does not choose winners.'],['.sponsor-lane, .mobile-ticket-trigger','Sponsor decision','The sponsor chooses winners, independently of odds and review cut.'],['.selection, .mobile-ticket-trigger','Selected submission','Review the submission, price and rank.'],['.ticket, .mobile-ticket-trigger','Ticket','Buy and Sell update your position.'],['.header > .primary','Connect wallet','Sample wallet funded with 250 sDAI.']];
export function Tour({close}:{close:()=>void}){
 const [step,setStep]=useState(0),[box,setBox]=useState({x:0,y:0,w:0,h:0}),[card,setCard]=useState({left:16,top:16});
 const dialog=useRef<HTMLDialogElement>(null),panel=useRef<HTMLDivElement>(null),reduced=useReducedMotion();
 useLayoutEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>{if(previous?.isConnected)previous.focus();};},[]);
 useLayoutEffect(()=>{
  const selector=innerWidth<=600&&step===2?'.ladder-row, .field-tile, .ranked-table tbody tr':steps[step][0];
  const visible=(el:HTMLElement)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
  const measure=()=>{const targets=[...document.querySelectorAll<HTMLElement>(selector)];const target=targets.find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;});if(!target)return;
   const r=target.getBoundingClientRect(),x=Math.max(0,r.left-4),y=Math.max(0,r.top-4),w=Math.min(innerWidth,r.right+4)-x,h=Math.min(innerHeight,r.bottom+4)-y;
   setBox({x,y,w,h});const cw=Math.min(304,innerWidth-32),ch=panel.current?.offsetHeight||180,gap=16;
   const candidates=[{left:x+w+gap,top:y},{left:x-cw-gap,top:y},{left:x,top:y+h+gap},{left:x,top:y-ch-gap}];
   const valid=candidates.map(p=>({left:Math.max(16,Math.min(p.left,innerWidth-cw-16)),top:Math.max(16,Math.min(p.top,innerHeight-ch-16))})).find(p=>p.left>=x+w+8||p.left+cw<=x-8||p.top>=y+h+8||p.top+ch<=y-8);
   setCard(valid??{left:16,top:innerHeight-ch-16});
  };
  const target=[...document.querySelectorAll<HTMLElement>(selector)].find(visible);target?.scrollIntoView({block:innerWidth<=600?'center':'nearest',behavior:'instant'});
  measure();const ro=new ResizeObserver(measure);if(target)ro.observe(target);if(panel.current)ro.observe(panel.current);window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{ro.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};
 },[step]);
 const {x,y,w,h}=box,r=Math.min(12,w/2,h/2),clip=`path(evenodd, 'M0 0H${innerWidth}V${innerHeight}H0Z M${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h-r}Q${x+w} ${y+h} ${x+w-r} ${y+h}H${x+r}Q${x} ${y+h} ${x} ${y+h-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z')`;
 return <dialog className="tour" data-testid="market-tour" ref={dialog} aria-label="Markets tour" onCancel={e=>{e.preventDefault();close();}}><div className="tour-scrim" style={{clipPath:clip}}/><motion.div className="tour-ring" aria-hidden="true" animate={{left:x,top:y,width:w,height:h}} transition={reduced?{duration:0}:{duration:reduced?0:.2,ease:[.16,1,.3,1]}}/><div className="tour-card" ref={panel} style={card}><div className="data-line"><span>{step+1} / 8</span><button onClick={close}>Close</button></div><h2>{steps[step][1]}</h2><p>{steps[step][2]}</p><div className="tour-actions"><button disabled={step===0} title={step===0?'First step':undefined} onClick={()=>setStep(n=>Math.max(0,n-1))}>Back</button><button className="primary btn-bubbles" onClick={()=>step===7?close():setStep(n=>n+1)}>{step===7?'Enter':'Next'}</button></div></div></dialog>;
}
