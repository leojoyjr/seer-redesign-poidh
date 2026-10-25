import {useEffect,useState} from 'react';
// Canvas pixels are outside CSS painting. Repaint on both shell events and root changes.
export function useThemePaint(){
 const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme);
 useEffect(()=>{const update=()=>setTheme(document.documentElement.dataset.theme);const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});window.addEventListener('seer:theme',update);return()=>{observer.disconnect();window.removeEventListener('seer:theme',update);};},[]);
 return theme;
}
