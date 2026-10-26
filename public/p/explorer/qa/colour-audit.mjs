// node public/p/explorer/qa/colour-audit.mjs
// Starts python http.server unless BASE_URL is supplied. PLAYWRIGHT_MODULE may be an absolute module path.
import {setup,prepare,visit,routes,output,filename,report} from './common.mjs';
export function scanColours(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true});const colours=new Map();
 const rgba=s=>{if(colours.has(s))return [...colours.get(s)];context.clearRect(0,0,1,1);context.fillStyle=s;context.fillRect(0,0,1,1);const pixel=[...context.getImageData(0,0,1,1).data];pixel[3]/=255;colours.set(s,pixel);return [...pixel]};
 const blend=(fg,bg)=>{const a=fg[3]??1;return fg.slice(0,3).map((v,i)=>v*a+bg[i]*(1-a)).concat(1)};
 const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const theme=document.documentElement.dataset.theme;
 const backdrop=el=>{if(!el)return theme==='light'?[247,247,249,1]:[16,16,19,1];const s=getComputedStyle(el);return blend(rgba(s.backgroundColor),backdrop(el.parentElement))};
 const findings=[];let checked=0;
 for(const el of document.querySelectorAll('body *')){
  if(el.closest('[inert],[aria-hidden=true],svg,script,style,head,select,option'))continue;
  const s=getComputedStyle(el),rect=el.getBoundingClientRect();if(!rect.width||!rect.height||s.visibility==='hidden'||s.display==='none'||el.checkVisibility&&!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
  const text=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim()||(el.matches('input,textarea')?(el.value||el.placeholder):'');if(!text)continue;
  checked++;const bg=backdrop(el);let fg=rgba(s.color);let opacity=1;for(let p=el;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);fg[3]=(fg[3]??1)*opacity;fg=blend(fg,bg);
  const a=lum(fg),b=lum(bg),contrast=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  const mismatch=theme==='light'?b<.12&&a<.18:b>.7&&a>.65;
  if(contrast<4.5||mismatch)findings.push({selector:el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(el.classList.length?'.'+[...el.classList].join('.'):''),text:text.slice(0,120),foreground:fg,background:bg,contrast:+contrast.toFixed(2),themeMismatch:mismatch,gradient:s.backgroundImage!=='none',disabled:el.matches(':disabled')});
 }
 return {theme,checked,findings};
}
const env=await setup('colour-audit');const results=[];const errors=[];
try{
 for(const width of [1440,390])for(const theme of ['light','dark']){
  const page=await env.browser.newPage({viewport:{width,height:960},isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'});await prepare(page,theme);
  page.on('pageerror',e=>errors.push(e.message));
  for(const route of routes){
   try{
    await visit(page,env.base+route);await page.evaluate(()=>document.fonts.ready);
    // Force lazy media and offscreen states to render before a full-page capture.
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>requestAnimationFrame(r))}scrollTo(0,0)});
    const capture=async state=>{await page.screenshot({path:new URL(filename(route,theme,width)+'-'+state+'.png',output).pathname,fullPage:true});results.push({route,width,state,...await page.evaluate(scanColours)})};
    await capture('page');
    // Real app overlays: search dialog, index preview, filters, custom dropdown, peek and toast.
    for(const selector of ['[data-command]','[data-ix-preview]','.ix-filter summary','.dd-trigger','[data-peek]','[data-follow]']){
     const target=page.locator(selector).first();if(!await target.count()||!await target.isVisible())continue;
     await target.click();await capture(selector.replace(/\W+/g,'_'));await page.keyboard.press('Escape');
     if(selector==='[data-follow]')await visit(page,env.base+route);
    }
   }catch(e){results.push({route,width,theme,error:e.message})}
  }await page.close();
 }
}finally{await report('colour-audit',{results,errors,limitations:['Alpha colours are composited through ancestor backgrounds. Gradients, images, pseudo-elements and overlapping siblings require visual screenshot review; reported gradient backgrounds are approximate. Disabled text is reported separately, not silently excluded.']});await env.close()}
const count=results.reduce((n,r)=>n+(r.findings?.filter(f=>!f.disabled).length||0)+(r.error?1:0),0)+errors.length;
console.log(`Colour audit: ${results.length} states, ${count} findings. See qa/results/colour-audit.json.`);if(count)process.exitCode=1;
