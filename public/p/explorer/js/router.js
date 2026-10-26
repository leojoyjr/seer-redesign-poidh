import {transition} from './transition.js';
export function route(){const [path,q='']=(location.hash.slice(1)||'/').split('?');return {path,params:new URLSearchParams(q)}}
export function navigate(url){location.hash=url}
export function filter(key,value){const {params}=route();if(value&&value!=='all')params.set(key,value);else params.delete(key);params.delete('page');navigate('/?'+params)}
export function start(render){let previous=route().path;addEventListener('hashchange',()=>{const next=route().path;transition(()=>{render();if(previous!==next)window.scrollTo({top:0,behavior:'instant'})},previous,next);previous=next;window.seerRoutePath=next});window.seerRoutePath=previous;render()}
