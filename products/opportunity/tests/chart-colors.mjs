import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/math/oddsColours.ts',import.meta.url),'utf8');
const js=ts.transpile(source,{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022});
const {oddsColour,luminance,contrast,mix}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const tokens=await readFile(new URL('../src/tokens.css',import.meta.url),'utf8');
const blocks=tokens.split(':root[data-theme=light]');
const declarations=text=>Object.fromEntries([...text.matchAll(/(--[\w-]+):([^;\n]+)/g)].map(m=>[m[1],m[2].trim()]));
for(const theme of ['dark','light']){
 const vars={...declarations(blocks[0]),...(theme==='light'?declarations(blocks[1]):{})};
 const resolve=value=>{
  if(value.startsWith('var('))return resolve(vars[value.slice(4,-1)]);
  if(value.startsWith('#'))return value.slice(1).match(/../g).map(x=>parseInt(x,16));
  const match=value.match(/^color-mix\(in srgb,(var\([^)]+\)),(var\([^)]+\)) ([\d.]+)%\)$/);
  assert(match,'Unsupported palette expression '+value);return mix(resolve(match[1]),resolve(match[2]),Number(match[3])/100);
 };
 const ramp=Array.from({length:17},(_,i)=>resolve(vars[`--ramp-${i}`]).map(Math.round));
 // Absolute WCAG luminance delta <= .16 per anchor (17 stops) prevents
 // abrupt dark/light blocks. Dense interpolation also stays below .04 (including the ink-switch contrast correction).
 for(let i=1;i<ramp.length;i++)assert(Math.abs(luminance(ramp[i])-luminance(ramp[i-1]))<=.16,`${theme}: ramp step ${i}`);
 let previous;
 for(let i=0;i<=1000;i++){
  const colour=oddsColour(ramp,resolve(vars['--tile-ink']),resolve(vars['--white']),i/1000);
  assert(contrast(colour.foreground,colour.background)>=4.5,`${theme}: label contrast at ${i}`);
  if(previous)assert(Math.abs(luminance(colour.background)-luminance(previous))<=.04,`${theme}: interpolated jump ${i}`);
  previous=colour.background;
 }
 console.log(`PASS ${theme}: 1001 heatmap/bubble/bar colours; contrast >=4.5; luminance steps <=.16`);
}
