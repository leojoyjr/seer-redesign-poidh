import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {setup,prepare,ready,routes,filename} from './common.mjs';
const shots=new URL('./shots-a5/',import.meta.url);await fs.mkdir(shots,{recursive:true});
const results=[],errors=[];let env;
try{
 env=await setup('a5');
 for(const width of [1024,1280,1440,1920,2560,390])for(const theme of ['light','dark']){
  const page=await env.browser.newPage({viewport:{width,height:1000}});await prepare(page,theme);
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  for(const route of routes){
   await page.goto(env.base+route);await ready(page);await page.waitForTimeout(1000);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${theme} ${route}: overflow`);
   if(route==='#/'){
    const c=page.locator('.d4-hero-create');assert.equal(await c.count(),1);assert.equal(Math.round((await c.boundingBox()).height),56);
    assert.equal(await c.getAttribute('href'),'https://app.seer.pm/create-market');
    assert.equal(await page.locator('.d4-product-ticker a').count(),5);
    await page.locator('#omnibox').fill('India');await page.waitForTimeout(400);assert(await page.locator('.suggestion-portal').isVisible());await page.locator('#omnibox').fill('');await page.keyboard.press('Escape');
    const card=page.locator('.d4-flip').first(),height=(await card.boundingBox()).height;await card.locator('[data-flip-to="1"]').click();assert.equal(await card.locator('[aria-pressed=true]').getAttribute('data-flip-to'),'1');assert.equal((await card.boundingBox()).height,height);await page.evaluate(()=>scrollTo(0,0));
   }
   await page.screenshot({path:new URL(filename(route,theme,width)+'.png',shots).pathname,fullPage:true});results.push({route,width,theme});
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);
}catch(e){errors.push(e.message);process.exitCode=1}
finally{await fs.writeFile(new URL('results.json',shots),JSON.stringify({results,errors,blocked:!env},null,2));await env?.close()}
