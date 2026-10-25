import {useLayoutEffect,useState} from 'react';
import {oddsColour,type RGB} from '../math/oddsColours';
const css=(rgb:RGB)=>`rgb(${rgb.map(value=>Math.round(value)).join(' ')})`;
// Resolve the EF ramp once per theme. Canvas understands computed color-mix values.
export function useOddsColours(){
 const [palette,setPalette]=useState<{ramp:RGB[];dark:RGB;light:RGB}|null>(null);
 useLayoutEffect(()=>{
  const resolve=()=>{
   const context=document.createElement('canvas').getContext('2d',{willReadFrequently:true});if(!context)return;
   const style=getComputedStyle(document.documentElement);
   const read=(token:string)=>{context.clearRect(0,0,1,1);context.fillStyle=style.getPropertyValue(token).trim();context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data].slice(0,3);};
   setPalette({ramp:Array.from({length:17},(_,i)=>read(`--ramp-${i}`)),dark:read('--tile-ink'),light:read('--white')});
  };
  resolve();const observer=new MutationObserver(resolve);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return()=>observer.disconnect();
 },[]);
 return (shade:number)=>{
  if(!palette)return {background:'var(--card)',color:'var(--text)'};
  const {background,foreground}=oddsColour(palette.ramp,palette.dark,palette.light,shade);
  return {background:css(background),color:css(foreground)};
 };
}
