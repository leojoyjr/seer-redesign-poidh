import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const source=new URL('../src/',import.meta.url);
const allowed=new Set(['101013','1a1a1e','1f1f24','f7f7f9','ffffff','f0f0f3','ededf2','a8a8b3','67676f','17171c','5c5c66','8e8e99','7b3aff','241e33','efe9fc','9c6ff2','4a2f99','cdb8ff','6c2bd9','3ddc97','12915f','ff5c72','d1334a']);
const tokens=await readFile(new URL('tokens.css',source),'utf8');
function approvedHex(value){
 const hex=value.toLowerCase();
 const expanded=hex.length===3||hex.length===4?[...hex].map(c=>c+c).join(''):hex;
 return (expanded.length===6||expanded.length===8)&&allowed.has(expanded.slice(0,6));
}
for(const match of tokens.matchAll(/#([\da-f]+)\b/gi))assert(approvedHex(match[1]),`Non-EF color ${match[0]}`);
assert(!/\b(?:yellow|amber|gold|orange|red|blue|green|purple|black|white)\b/i.test(tokens.replace(/--[\w-]+/g,'')),'Named colors must use EF tokens');
assert(!/\b(?:hsla?|hwb|lab|lch|oklab|oklch|color)\(/i.test(tokens),'Literal alternate color spaces bypass the EF palette');
for(const match of tokens.matchAll(/rgba?\(([^)]+)\)/g))assert(['255,255,255,.16','237,237,242,0.1','23,23,28,0.1'].includes(match[1]),'Only EF neutral hatch/highlight RGB is permitted');
assert.match(tokens,/--line:color-mix\(in srgb,var\(--text\) 10%,transparent\)/);
async function inspect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=new URL(entry.name+(entry.isDirectory()?'/':''),dir);if(entry.isDirectory())await inspect(path);else if(/\.(css|tsx?|json)$/.test(entry.name)&&entry.name!=='tokens.css'){const text=await readFile(path,'utf8');assert(!/#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b/i.test(text),`Literal color outside tokens.css: ${path.pathname}`);assert(!/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(\s*[\d.]/i.test(text),`Literal RGB outside tokens.css: ${path.pathname}`);}}}
await inspect(source);
console.log('EF palette passed: approved colors, derived hairlines, no literal colors outside tokens.css.');
