import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const sourceRoot=new URL('../src/',import.meta.url);
function load(hash='#/'){
 const handlers=new Map();let currentHash=hash;
 const location={search:'?n=3',pathname:'/'};
 Object.defineProperty(location,'hash',{get:()=>currentHash,set:value=>{currentHash=value.startsWith('#')?value:'#'+value;}});
 const context=vm.createContext({URLSearchParams,location,window:{addEventListener:(name,callback)=>handlers.set(name,callback)},history:{replaceState:(_state,_unused,url)=>{currentHash=url.slice(url.indexOf('#'));}}});
 const require=path=>{
  if(path==='react')return {useSyncExternalStore:(_subscribe,snapshot)=>snapshot()};
  if(path.endsWith('.json'))return JSON.parse(readFileSync(new URL('data/'+path.slice(2),sourceRoot),'utf8'));
  if(path==='../math/rng')return evaluate('math/rng.ts');
  throw Error('Unexpected import '+path);
 };
 function evaluate(path){
  const text=readFileSync(new URL(path,sourceRoot),'utf8').replaceAll('import.meta.env','({})');
  const js=ts.transpile(text,{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true});
  const exports={};vm.runInContext(`(function(require,exports){${js}\n})`,context)(require,exports);return exports;
 }
 const api=evaluate('data/markets.ts');
 return {api,location,flush:()=>handlers.get('hashchange')(),state:()=>api.useMarkets()};
}
const final='seer-rebrand-contest';
for(const filter of ['Completed','All']){
 const app=load();
 app.api.setFilters({status:filter});app.flush();
 assert.equal(app.state().status,filter);
 if(filter==='Completed')assert.equal(app.state().markets.find(m=>m.id===app.state().selectedId).status,'Finalized','User change selects first visible market');
 app.api.selectMarket(final);app.location.hash=`/m/${final}`;app.flush();
 assert.equal(app.state().status,filter);assert.equal(app.state().selectedId,final);
 assert.equal(new URLSearchParams(app.location.hash.split('?')[1]).get('filter'),filter.toLowerCase());
 const restored=load(app.location.hash);restored.api.selectMarket(final);assert.equal(restored.state().status,filter);
 // History restoring a filter must never implicitly replace the selection.
 app.location.hash=`/m/${final}?filter=active`;app.flush();
 assert.equal(app.state().status,'Active');assert.equal(app.state().selectedId,final);
 app.location.hash=`/m/${final}?filter=${filter.toLowerCase()}`;app.flush();
 assert.equal(app.state().status,filter);assert.equal(app.state().selectedId,final);
 console.log(`PASS ${filter}: explicit filter fallback; selection; canonical URL; reload; history`);
}
