import {useSyncExternalStore} from 'react';
const subscribe=(notify:()=>void)=>{window.addEventListener('hashchange',notify);return()=>window.removeEventListener('hashchange',notify);};
export function useRoute(){return useSyncExternalStore(subscribe,()=>location.hash||'#/');}

export let sheetOrigin:DOMRect|null=null;
export function openMarketSheet(id:string){sheetOrigin=document.activeElement?.getBoundingClientRect()??null;const [path,search]= (location.hash||"#/").split("?");const q=new URLSearchParams(search);q.set("open",id);location.hash=`${path}?${q}`;}
