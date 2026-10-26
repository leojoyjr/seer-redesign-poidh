import assert from 'node:assert/strict';
import {setup,prepare,ready,routes,report} from './common.mjs';
const results=[],errors=[];let env;
try{
 env=await setup('job-a6');
 for(const width of [390,1280,1920])for(const theme of ['light','dark']){
  const page=await env.browser.newPage({viewport:{width,height:1000}});await prepare(page,theme);
  page.on('pageerror',e=>errors.push(e.message));
  for(const route of routes){
   await page.goto(env.base+route);await ready(page);await page.waitForTimeout(450);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow: ${route} ${width}`);
   if(!route.startsWith('#/?')&&route!=='#/'){
    assert.equal(await page.locator('.a6-back').count(),1,route);
    const back=await page.locator('.a6-back').boundingBox(),header=await page.locator('#header').boundingBox();assert(back.y>=header.y+header.height,'Back overlaps sub-bar');
    await page.locator('.a6-back').click();await page.waitForURL(u=>u.hash==='#/');
   }
   results.push({route,width,theme});
  }
  await page.goto(env.base+'#/');await ready(page);
  const cards=page.locator('.d4-tile,.d4-form,.d4-need');for(const card of await cards.all())assert.equal(await card.locator('.a6-card-art img').count(),1);
  assert(await page.locator('.a6-card-art img').evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>{img.loading='eager';return img.decode()}));return imgs.every(img=>img.naturalWidth>0)}),'Missing market artwork');
  const flip=page.locator('.d4-flip').first();const first=await flip.locator('.is-current .d4-q').getAttribute('href');await flip.locator('[data-flip-to="1"]').click();assert.notEqual(await flip.locator('.is-current .d4-q').getAttribute('href'),first);assert.equal(await flip.locator('.is-current .a6-card-art img').count(),1);
  for(const [key,label] of [['daos','Futarchy'],['funders','Opportunity'],['researchers','Risk']]){
   await page.goto(env.base+'#/');await ready(page);await page.locator(`.a6-audience[href$="audience=${key}"]`).click();await page.waitForURL(u=>u.hash.includes('audience='+key));await page.waitForTimeout(500);assert(await page.locator('.a6-active-filter').isVisible());assert((await page.locator('.a6-active-filter').innerText()).includes(label));assert(await page.locator('#idx-t').isVisible());
   await page.keyboard.press('Escape');await page.waitForURL(u=>u.hash==='#/');
  }
  await page.goto(env.base+'#/');await ready(page);await page.locator('.a6-audience[href="#/agents"]').click();await page.waitForURL(u=>u.hash==='#/agents');await page.waitForTimeout(400);assert(await page.locator('h1').isVisible());
  await page.goto(env.base+'#/');await ready(page);await page.locator('.d4-hero-how').click();await page.waitForURL(u=>u.hash==='#/how');await page.waitForTimeout(400);await page.evaluate(()=>document.querySelector('#dialog').showModal());await page.keyboard.press('Escape');assert.equal(new URL(page.url()).hash,'#/how');await page.keyboard.press('Escape');await page.waitForURL(u=>u.hash==='#/');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.a6-halo').evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.screenshot({path:new URL(`results/a6-${theme}-${width}.png`,import.meta.url).pathname,fullPage:true});await page.route('**/__a6-shell.html',route=>route.fulfill({contentType:'text/html',body:`<html><body style="margin:0"><div style="height:64px">Shell</div><iframe title="Explorer" src="${env.base}#/how" style="border:0;width:100%;height:900px"></iframe></body></html>`}));
  await page.goto(env.base+'__a6-shell.html');const frame=page.frames().find(f=>f.url().includes('#/how'));await frame.waitForSelector('.a6-back');await frame.evaluate(t=>document.documentElement.dataset.theme=t,theme);const position=await frame.evaluate(()=>({back:document.querySelector('.a6-back').getBoundingClientRect().top,bar:document.querySelector('#header').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth+1}));assert(position.back>=position.bar);assert(!position.overflow);await page.screenshot({path:new URL(`results/a6-shell-${theme}-${width}.png`,import.meta.url).pathname,fullPage:true});await page.close();
 }
 assert.deepEqual(errors,[]);
}catch(e){errors.push(e.stack||e.message);process.exitCode=1}
finally{await report('job-a6',{results,errors,blocked:!env});await env?.close()}
