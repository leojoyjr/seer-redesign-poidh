import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const ledger=JSON.parse(await fs.readFile(path.join(root,'data/ledger.json'),'utf8'));
async function files(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]))).flat()}
const all=await files(root);let checks=0;
for(const file of all.filter(f=>/\.(js|mjs)$/.test(f)&&!f.includes('/vendor/'))){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);checks++}
for(const m of ledger){if(m.image&&!/^https?:/.test(m.image)){await fs.access(path.join(root,m.image));checks++}}
for(const file of all.filter(f=>f.endsWith('.js')&&f.includes('/js/'))){const text=await fs.readFile(file,'utf8');for(const match of text.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){await fs.access(path.resolve(path.dirname(file),match[1]));checks++}}
const design=await fs.readFile(path.join(root,'js/design.js'),'utf8');assert(!design.includes('live2-t'));assert(!design.includes('Live signals'));checks+=2;
const selection=design.slice(design.indexOf('export function flipMarkets'),design.indexOf('function flipTile')).replace('export ','');
const context=vm.createContext({ledger,best:k=>ledger.find(m=>m.product===k)});vm.runInContext(selection,context);
const selections={};for(const product of ['seer','deep','futarchy','opportunity','risk']){
 const rows=vm.runInContext(`flipMarkets('${product}')`,context);assert(rows.length>=2&&rows.length<=3);assert(rows.every(m=>m.product===product&&['Trading','Awaiting answer'].includes(m.state)));assert.equal(new Set(rows.map(m=>m.id)).size,rows.length);selections[product]=rows.map(m=>({id:m.id,state:m.state,asker:m.asker.id}));checks+=3;
}
const css=await fs.readFile(path.join(root,'index.css'),'utf8');assert(!/var\(--(?:card|nested|text2|btn2|btn2-text),/.test(css));checks++;
const savings=JSON.parse(await fs.readFile(path.join(root,'qa/asset-savings.json')));for(const item of savings){await fs.access(path.join(root,item.to));assert(item.after<item.before);checks++}
const result={checks,selections,optimizedAssets:savings.length,beforeBytes:savings.reduce((s,x)=>s+x.before,0),afterBytes:savings.reduce((s,x)=>s+x.after,0)};
await fs.mkdir(path.join(root,'qa/results'),{recursive:true});await fs.writeFile(path.join(root,'qa/results/static-check.json'),JSON.stringify(result,null,2)+'\n');console.log(`${checks} static checks passed; ${savings.length} smaller assets.`);
