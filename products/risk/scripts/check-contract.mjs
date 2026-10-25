import fs from 'node:fs';
const base=new URL('../src/',import.meta.url);
const files=[...fs.readdirSync(new URL('components/',base)).filter(f=>f.endsWith('.tsx')).map(f=>fs.readFileSync(new URL(`components/${f}`,base),'utf8')),fs.readFileSync(new URL('App.tsx',base),'utf8')].join('\n');
const ids=new Set([...files.matchAll(/(?:data-testid|testid)="([^"]+)"/g)].map(m=>m[1]));
const templates=['pill-${a.id}','asset-row-${a.id}','asset-slider-${a.id}','asset-value-${a.id}','asset-delta-${a.id}','asset-details-${a.id}','asset-tile-${a.id}','overtime-your-${a.id}','overtime-end-label-${v.a.id}','chip-${g}','panel-filter-${g}','assets-filter-${g}','group-${g}','nav-${id}','view-${v}','modal-${s.modal}','help-item-${i+1}','credora-metric-${i+1}','link-${id}'];
for(const template of templates){if(!files.includes('`'+template+'`'))throw Error(`Missing ID template: ${template}`)}
const spec=fs.readFileSync(new URL('../../../products/risk/BUILD_SPEC.md',import.meta.url),'utf8').split('## DATA-TESTID CONTRACT')[1];
const families=new Set(templates.map(t=>t.split('${')[0].slice(0,-1)));
const required=[...spec.matchAll(/\b[a-z]+(?:-[a-z0-9]+)+\b/g)].map(m=>m[0]);
const generated=id=>families.has(id)||templates.some(t=>id.startsWith(t.split('${')[0]));
const missing=[...new Set(required)].filter(id=>id!=='data-testid'&&!ids.has(id)&&!generated(id));
if(missing.length)throw Error(`Missing IDs: ${missing.join(', ')}`);
console.log(`Contract source audit passed: ${ids.size} literal IDs and ${templates.length} dynamic ID families. Conditional rendering checked at source only.`);
