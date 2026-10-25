import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {assets,type Asset,type Group,type Estimates,market,survival,rescale} from './math/model';
function useModel(){
 const query=new URLSearchParams(location.search);
 const [selected,setSelected]=useState<string[]>(query.has('sel')?query.get('sel')!.split(',').filter(id=>assets.some(a=>a.id===id)):assets.map(a=>a.id));
 const [view,setView]=useState(query.get('view')==='time'?'time':'bars');
 const [horizon,setHorizon]=useState(Math.max(25,Math.min(100,Number(query.get('h'))||100)));
 const [assetGroup,setAssetGroup]=useState<Group>('all');
 const [assetSearch,setAssetSearch]=useState('');
 const [estimates,setEstimates]=useState<Estimates>({});
 const [modal,setModal]=useState('');
 const [addr,setAddrState]=useState<string|null>(null);
 const setAddr=(a:string|null)=>{setAddrState(a);(window as Window & {seerShell?:{setConnected:(address:string|null)=>void}}).seerShell?.setConnected(a)};
 const [drawer,setDrawer]=useState<Asset|null>(null);
 const [theme,setTheme]=useState(()=>{const t=localStorage.getItem('seer.theme')||localStorage.getItem('risk2-theme');return t==='light'?'light':'dark'});
 useEffect(()=>{const on=(e:Event)=>{const t=(e as CustomEvent).detail?.theme;if(t==='light'||t==='dark')setTheme(t)};const c=(e:Event)=>{(e as Event & {seerHandled?:boolean}).seerHandled=true;setModal('connect')};window.addEventListener('seer:theme',on);window.addEventListener('seer:connect',c);return()=>{window.removeEventListener('seer:theme',on);window.removeEventListener('seer:connect',c)}},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
 useEffect(()=>{const q=new URLSearchParams(location.search);q.set('sel',selected.join(','));q.set('view',view);q.set('h',String(horizon));window.history.replaceState(null,'',`${location.pathname}?${q}${location.hash}`)},[selected,view,horizon]);
 useEffect(()=>{const sync=()=>{const q=new URLSearchParams(location.search);setSelected(q.has('sel')?q.get('sel')!.split(',').filter(id=>assets.some(a=>a.id===id)):assets.map(a=>a.id));setView(q.get('view')==='time'?'time':'bars');setHorizon(Math.max(25,Math.min(100,Number(q.get('h'))||100)))};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync)},[]);
 const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const edited=assets.filter(a=>estimates[a.id]!==undefined && Math.abs(estimates[a.id]-a.m)>1e-12);
 const aggregate=survival(assets.map(a=>estimates[a.id]??a.m));
 return {assetGroup,setAssetGroup,assetSearch,setAssetSearch,selected,setSelected,toggle,view,setView,horizon,setHorizon,estimates,setEstimates,edited,aggregate,market,modal,setModal,addr,setAddr,drawer,setDrawer,theme,setTheme,reset:()=>setEstimates({}),setAggregate:(v:number)=>setEstimates(rescale(v)),setAsset:(id:string,v:number)=>setEstimates(e=>({...e,[id]:v}))};
}
const Context=createContext<ReturnType<typeof useModel>|null>(null);
export function Provider({children}:{children:ReactNode}){const model=useModel();return <Context.Provider value={model}>{children}</Context.Provider>}
export function useRisk(){const value=useContext(Context);if(!value)throw Error('Missing provider');return value;}
