import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { markets } from '../data/markets';
export function Search(){
 const [open,setOpen]=useState(false),[q,setQ]=useState(''),[index,setIndex]=useState(0);
 const ref=useRef<HTMLDialogElement>(null),previous=useRef<HTMLElement|null>(null);
 const rows=markets.filter(m=>m.name.toLowerCase().includes(q.toLowerCase()));
 const close=()=>setOpen(false);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const editing=(e.target as HTMLElement).matches('input,textarea,select');if((e.key==='/'&&!editing)||((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k')){e.preventDefault();previous.current=document.activeElement as HTMLElement;setQ('');setIndex(0);setOpen(true);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 useLayoutEffect(()=>{if(open)ref.current?.showModal();else previous.current?.focus();},[open]);
 return open?<dialog ref={ref} aria-label="Search repositories" className="search-dialog" onCancel={e=>{e.preventDefault();close();}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setIndex(i=>Math.max(0,Math.min(rows.length-1,i+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Enter'&&rows[index]){e.preventDefault();location.hash=`#/repo/${rows[index].name}`;close();}if(e.key==='Tab'){const controls=Array.from(ref.current?.querySelectorAll<HTMLElement>('input,button')??[]);if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0]?.focus();}}}}><h2>Repositories</h2><input autoFocus aria-label="Search repositories" value={q} onChange={e=>{setQ(e.target.value);setIndex(0);}}/><div className="search-results">{rows.map((m,i)=><button key={m.id} aria-current={i===index} onClick={()=>{location.hash=`#/repo/${m.name}`;close();}}>{m.name}</button>)}{!rows.length&&<p>No repositories match</p>}</div><button onClick={close}>Close search</button></dialog>:null;
}
