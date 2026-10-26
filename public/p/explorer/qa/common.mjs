import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
export const root=fileURLToPath(new URL('../',import.meta.url));
export const output=new URL('./results/',import.meta.url);
export const ledger=JSON.parse(await fs.readFile(new URL('../data/ledger.json',import.meta.url)));
export const products=['seer','deep','futarchy','opportunity','risk'];
export const routes=['#/','#/markets',...['ledger','trades','need','askers','timeline'].map(v=>'#/?view='+v),...products.map(k=>'#/m/'+encodeURIComponent(ledger.find(m=>m.product===k).id)),...products.map(k=>'#/p/'+k),'#/askers','#/a/'+encodeURIComponent(ledger[0].asker.id),'#/agents','#/traders','#/how','#/developers','#/watchlist','#/ask'];
export async function setup(name){
 await fs.mkdir(output,{recursive:true});
 let server;const base=process.env.BASE_URL||'http://127.0.0.1:5303/';
 if(!process.env.BASE_URL){
  server=spawn('python3',['-m','http.server','5303','--bind','127.0.0.1','--directory',root],{stdio:['ignore','ignore','pipe']});
  let error='';server.stderr.on('data',b=>error+=b);
  try{await new Promise((resolve,reject)=>{let attempts=0;const poll=async()=>{if(server.exitCode!==null)return reject(Error('Python server failed: '+error));try{const r=await fetch(base);if(r.ok)return resolve()}catch{}if(++attempts===40)return reject(Error('Server did not start: '+error));setTimeout(poll,100)};poll()})}catch(e){server.kill();await report(name,{blocked:e.message});throw e}
 }
 let browser;
 try{const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');browser=await chromium.launch({channel:process.env.CHROME_CHANNEL||'chrome',headless:true})}catch(e){server?.kill();await report(name,{blocked:e.message});throw e}
 return {browser,base,close:async()=>{await browser.close();server?.kill()}};
}
export async function report(name,data){await fs.mkdir(output,{recursive:true});await fs.writeFile(new URL(name+'.json',output),JSON.stringify(data,null,2)+'\n')}
export async function prepare(page,theme='dark'){
 await page.addInitScript(theme=>{localStorage.setItem('seer.theme',theme);localStorage.setItem('seer.welcome','done');localStorage.setItem('seer.tour','done');window.__longTasks=[];new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true})},theme);
}
export async function ready(page){await page.waitForFunction(()=>{const m=document.querySelector('main');return m?.innerText.trim().length>80&&!m.querySelector('.skeleton,[aria-busy=true],.ix-skeleton')&&!/ledger could not load|could not load\.|not found/i.test(m.innerText)},{},{timeout:3000})}
export async function visit(page,url){const start=performance.now();await page.goto(url,{waitUntil:'domcontentloaded',timeout:3000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await ready(page);const ms=Math.round(performance.now()-start);if(ms>3000)throw Error(`Page exceeded 3s (${ms}ms): ${url}`);return ms}
export const filename=(route,theme,width)=>`${theme}-${width}-${route.replace(/[^a-z0-9]+/gi,'_').slice(0,150)}`;
