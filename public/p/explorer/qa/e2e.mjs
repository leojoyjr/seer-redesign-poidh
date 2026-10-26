// Starts python http.server at the standalone explorer root, never the shell.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node public/p/explorer/qa/e2e.mjs
// Capture baseline before changes with --baseline. BASE_URL can point at another standalone deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {setup,prepare,ready,visit,routes,products,output,report} from './common.mjs';
const name=process.argv.includes('--baseline')?'e2e-before':'e2e';
const env=await setup(name),results=[],failures=[],links=new Map(),controls=[];
const remember=(url,from,download=false)=>{if(!/^(https?:)/.test(url))return;const old=links.get(url);links.set(url,{url,from:old?.from||from,download:old?.download||download})};
function monitor(page,label){
 const requests=new Map();
 page.on('pageerror',e=>failures.push({label,kind:'pageerror',message:e.message}));
 page.on('console',m=>{if(m.type()==='error')failures.push({label,kind:'console',message:m.text()})});
 page.on('request',r=>requests.set(r,performance.now()));
 page.on('requestfinished',r=>{const ms=performance.now()-requests.get(r);requests.delete(r);if(ms>2000)failures.push({label,kind:'slow-request',url:r.url(),ms:Math.round(ms)})});
 page.on('requestfailed',r=>{requests.delete(r);if(!r.failure()?.errorText.includes('ERR_ABORTED'))failures.push({label,kind:'requestfailed',url:r.url(),message:r.failure()?.errorText})});
 page.on('response',r=>{if(r.status()>=400)failures.push({label,kind:'http',url:r.url(),status:r.status()})});
 return ()=>{for(const [r,start] of requests)if(performance.now()-start>2000)failures.push({label,kind:'unfinished-request',url:r.url()})};
}
async function collect(page,from){for(const a of await page.locator('a[href]').evaluateAll(as=>as.map(a=>({url:a.href,download:a.hasAttribute('download')}))))remember(a.url,from,a.download);for(const h of await page.locator('[data-open],[data-market-open]').evaluateAll(es=>es.map(e=>e.dataset.open||'#/m/'+encodeURIComponent(e.dataset.marketOpen))))remember(new URL(h,page.url()).href,from)}
try{
 for(const width of [1440,390])for(const theme of ['light','dark']){
  const page=await env.browser.newPage({viewport:{width,height:960},isMobile:width===390,hasTouch:width===390});await prepare(page,theme);const finish=monitor(page,`${theme}-${width}`);
  for(const route of routes){
   try{
    const ms=await visit(page,env.base+route);assert(ms<=3000,`Route took ${ms}ms`);await collect(page,route);
    results.push({route,width,theme,ms,...await page.evaluate(()=>({longTasks:window.__longTasks,resources:performance.getEntriesByType('resource').map(e=>({url:e.name,duration:Math.round(e.duration),bytes:e.transferSize})),text:document.querySelector('main').innerText.length}))});
    // Snapshot every enabled button; operate each in its original route context.
    // Static app actions only save local demo state; downloads/copy are inventoried without firing.
    const buttons=await page.locator('main button,header button,main [role=button],main summary').evaluateAll(es=>es.map((e,i)=>{e.dataset.qaControl=String(i);return {i,text:e.textContent.trim().slice(0,90),disabled:e.matches(':disabled'),skip:e.matches('[data-copy],[data-download-summary],[data-export],button[type=submit]')}}));
    for(const button of buttons){
     controls.push({route,width,theme,...button});if(button.disabled||button.skip)continue;
     try{
      await visit(page,env.base+route);
      const candidates=page.locator('main button,header button,main [role=button],main summary');const target=candidates.nth(button.i);if(!await target.count()||!await target.isVisible())continue;
      const popups=[];const onPopup=p=>popups.push(p);page.on('popup',onPopup);
      try{await target.click({timeout:3000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await collect(page,route);if(page.url()!==new URL(route,env.base).href){await ready(page);remember(page.url(),route)}
       for(const popup of popups){await popup.waitForLoadState('domcontentloaded',{timeout:3000});remember(popup.url(),route);await popup.close()}
      }finally{page.off('popup',onPopup)}
     }catch(e){failures.push({route,width,theme,kind:'control',button:button.text,message:e.message})}
    }
   }catch(e){failures.push({route,width,theme,kind:'route',message:e.message})}
  }
  // Pager operation must select the corresponding market and keep the card height.
  try{await visit(page,env.base+'#/');assert.equal(await page.locator('#live2-t').count(),0);assert.equal(await page.locator('.d4-flip').count(),products.length);
   for(const card of await page.locator('.d4-flip').all()){
    const h=(await card.boundingBox()).height;const dots=card.locator('[data-flip-to]');for(let i=0;i<await dots.count();i++){await dots.nth(i).click();assert.equal(await dots.nth(i).getAttribute('aria-pressed'),'true');assert.equal(await card.locator('.d4-face:not([inert])').count(),1);assert.equal((await card.boundingBox()).height,h);const a=card.locator('.d4-face:not([inert]) .d4-q');assert.match(await a.getAttribute('href'),/^#\/m\//)}
   }
  }catch(e){failures.push({width,theme,kind:'flip',message:e.message})}
  finish();await page.close();
 }
 // Motion behavior is checked separately so screenshots and route timings do not mask it.
 const motion=await env.browser.newPage({viewport:{width:1440,height:960}});await prepare(motion);monitor(motion,'flip-motion');
 try{
  await visit(motion,env.base+'#/');
  await motion.evaluate(()=>{window.__flips=[];document.querySelectorAll('.d4-flip').forEach((card,index)=>new MutationObserver(records=>{if(records.some(r=>r.attributeName==='aria-pressed'&&r.target.getAttribute('aria-pressed')==='true'))window.__flips.push({index,time:performance.now()})}).observe(card,{subtree:true,attributes:true,attributeFilter:['aria-pressed']}))});
  await motion.mouse.move(0,0);await motion.waitForTimeout(10500);
  const flips=await motion.evaluate(()=>window.__flips);assert.equal(new Set(flips.map(f=>f.index)).size,5,'Every card must auto advance');
  for(let i=1;i<flips.length;i++)assert(flips[i].time-flips[i-1].time>=500,'Cards must not flip together');
  await visit(motion,env.base+'#/');const first=motion.locator('.d4-flip').first();
  await first.hover();const initial=await first.locator('[aria-pressed=true]').getAttribute('data-flip-to');
  await motion.waitForTimeout(6200);assert.equal(await first.locator('[aria-pressed=true]').getAttribute('data-flip-to'),initial,'Hover must pause');
  await motion.mouse.move(0,0);await first.locator('[data-flip-to]').first().focus();
  await motion.waitForTimeout(6200);assert.equal(await first.locator('[aria-pressed=true]').getAttribute('data-flip-to'),initial,'Focus must pause');
  await motion.emulateMedia({reducedMotion:'reduce'});await motion.evaluate(()=>document.activeElement.blur());
  await motion.waitForTimeout(6200);assert.equal(await first.locator('[aria-pressed=true]').getAttribute('data-flip-to'),initial,'Reduced motion must disable auto advance');
  await first.locator('[data-flip-to="1"]').click();assert.equal(await first.locator('[data-flip-to="1"]').getAttribute('aria-pressed'),'true');
  const href=await first.locator('.d4-face:not([inert]) .d4-q').getAttribute('href');await first.locator('.d4-face:not([inert]) .d4-q').click();await ready(motion);assert(motion.url().endsWith(href),'Visible face must open its own market');
 }catch(e){failures.push({kind:'flip-motion',message:e.message})}finally{await motion.close()}
 // Resolve every unique collected destination, including data downloads and external docs/social.
 // New hash destinations extend this queue, so links on detail/secondary routes are covered too.
 const tested=new Set();
 for(const entry of links.values()){
  if(tested.has(entry.url))continue;tested.add(entry.url);
  const page=await env.browser.newPage();await prepare(page);const finish=monitor(page,entry.url);const start=performance.now();
  try{
   if(entry.download||/\.(json|csv|txt)(?:$|[?#])/.test(entry.url)){const response=await page.request.get(entry.url,{timeout:3000});assert(response.ok(),`HTTP ${response.status()}`);assert((await response.body()).length>0,'Empty download')}
   else{
    const response=await page.goto(entry.url,{waitUntil:'domcontentloaded',timeout:3000});assert(!response||response.ok(),`HTTP ${response?.status()}`);
    if(entry.url.startsWith(env.base)){await ready(page);await collect(page,entry.url)}else await page.waitForFunction(()=>document.body?.innerText.trim().length>40,null,{timeout:3000});
    assert(!/404: NOT_FOUND|404 - Not Found|Cannot GET|File not found/i.test(await page.locator('body').innerText()),'Error page');
   }
   const ms=Math.round(performance.now()-start);assert(ms<=3000,`Destination took ${ms}ms`);results.push({...entry,ms});
  }catch(e){failures.push({...entry,kind:'destination',message:e.message})}finally{finish();await page.close()}
 }
}finally{
 let before;try{before=JSON.parse(await fs.readFile(new URL('e2e-before.json',output)))}catch{}
 const compare=before?.results?.filter(r=>r.route).map(r=>({route:r.route,width:r.width,theme:r.theme,before:r.ms,after:results.find(a=>a.route===r.route&&a.width===r.width&&a.theme===r.theme)?.ms}));
 await report(name,{results,failures,links:[...links.values()],controls,compare});await env.close();
}
console.log(`${results.length} completed checks; ${links.size} destinations; ${failures.length} failures. See qa/results/${name}.json`);if(failures.length)process.exitCode=1;
