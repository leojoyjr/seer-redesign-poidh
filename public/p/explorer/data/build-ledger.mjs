import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const text=p=>fs.readFileSync(path.join(root,p),'utf8');
const api=n=>JSON.parse(read(`research/crawl-v3/${n}.json`).body);
const write=(n,x)=>fs.writeFileSync(path.join(out,n),JSON.stringify(x,null,2)+'\n');
const snapshotTs=1792944000; // 2026-10-26 UTC; compilation date, not a claim of live refresh.
const chainNames={1:'Ethereum',100:'Gnosis',10:'OP Mainnet',8453:'Base'};
const ledger=[];
const imageContext={window:{}}; vm.runInNewContext(text('apps/explorer-v2/assets/image-map.js'),imageContext);
const imageMap=Object.values(imageContext.window).find(x=>typeof x==='object')||{};
const asker=(id,name,kind,address=null,derived=false)=>({id,name,kind,address,derived});
const unknown=asker('deep-round3','Deep · Round 3 organizer','Sponsor/Funder',null,true);
function add(m){
 m.history=m.history?.length?m.history:[{ts:snapshotTs-86400,values:m.pricing.outcomes.map(o=>o.p),derived:true},{ts:snapshotTs,values:m.pricing.outcomes.map(o=>o.p),derived:true}];
 m.historyNote=m.history[0]?.derived?'Derived flat reconstruction of the saved quote; no historical movement is asserted.':'Captured historical points; not live.';
 m.compiledAt='2026-10-26';m.snapshotDate=null;m.sourceState='saved snapshot; quote timestamp not supplied';
 ledger.push(m);
}
function base(m,product='seer'){
 const binary=m.outcomes.filter(n=>!['Invalid','No To All'].includes(n)).length===2&&m.outcomes.some(n=>/^yes$/i.test(n));
 const scalar=Number(m.upperBound)>Number(m.lowerBound)&&m.outcomes.filter(n=>n!=='Invalid').every(n=>/^(up|down)$/i.test(n));
 const multiScalar=String(m.templateId)==='1'&&!scalar; 
 const kind=scalar?'scalar':binary?'binary':'categorical';
 const outcomes=m.outcomes.map((name,i)=>({name,p:m.odds?.[i]==null?null:Number(m.odds[i])/100}));
 const top=outcomes.filter(o=>o.p!==null).sort((a,b)=>b.p-a.p)[0];
 const image=imageMap[m.images?.market]||null;
 if(image)fs.copyFileSync(path.join(root,'apps/explorer-v2',image),path.join(out,'..',image));
 const state=m.payoutReported?'Resolved':Number(m.questionsInArbitration)>0?'In dispute':m.hasAnswers?'Challenge window':m.openingTs<=snapshotTs?'Awaiting answer':'Trading';
 return {id:`${product}-${m.chainId||100}-${m.id.toLowerCase()}`,sourceId:m.id,product,type:multiScalar?'multi-scalar':String(m.templateId)==='3'?'multi-categorical':kind,chain:chainNames[m.chainId||100],chainId:m.chainId||100,title:m.marketName,image,asker:asker(m.creator,m.creator,'Person',m.creator),oracle:{kind:'Reality.eth / Kleros',status:state,bond:m.questions?.[0]?.bond??null,bondUnit:'raw collateral units',finalizeTs:m.finalizeTs<1e10?m.finalizeTs:null},state,pricing:{kind,outcomes,headline:scalar?{label:'Expected value',value:outcomes.find(o=>/^up$/i.test(o.name))?.p==null?null:Number(m.lowerBound)/1e18+outcomes.find(o=>/^up$/i.test(o.name)).p*(Number(m.upperBound)-Number(m.lowerBound))/1e18,unit:m.marketName.match(/\[([^\]]+)\]\s*$/)?.[1]||'units'}:{label:top?.name||'Quote unavailable',value:top?.p??null,unit:multiScalar?'share':'probability'},lowerBound:m.lowerBound,upperBound:m.upperBound},useIt:{decision:'Forecast an event',sentence:multiScalar?'Compare each outcome’s share of the total; these are allocations rather than mutually exclusive event probabilities.':scalar?'Read the outcome-token price against the published numeric bounds; it is not a yes/no probability.':binary?'Compare the crowd’s implied chance with your evidence before taking a position.':'Compare the priced outcomes; each quote is evidence about the eventual answer.',derived:true},volume:m.volumeUSD??null,liquidity:m.liquidityUSD??null,amountUnit:'USD',opensTs:m.blockTimestamp??null,closesTs:m.openingTs??null,contract:m.id,productUrl:`https://app.seer.pm/markets/${m.chainId||100}/${m.id}`,tradeable:'native',history:[],source:{file:'apps/explorer-v2/data/markets.json'},resolution:{questions:m.questions||[],questionId:m.questionId,wrappedTokens:m.wrappedTokens,verification:m.verification}};
}
const originals=read('apps/explorer-v2/data/markets.json').markets;
const fresh=[...api('app_api2').markets,...api('app_api3').markets];
const merged=new Map(originals.map(m=>[m.id,m]));fresh.forEach(m=>merged.set(m.id,{...merged.get(m.id),...m}));
const chosen=[...merged.values()].slice(0,39);
const eth=[...merged.values()].find(m=>m.chainId===1);if(eth&&!chosen.some(m=>m.id===eth.id))chosen.push(eth);
chosen.forEach(m=>{const x=base(m);x.source.file=fresh.some(f=>f.id===m.id)?'research/crawl-v3/app_api2.json + app_api3.json':x.source.file;add(x);});
const routes={};
for(const p of ['markets','closedMarkets']){const s=text(`src/products/futarchy/data/${p}.ts`);for(const match of s.matchAll(/id: '([^']+)',\s*marketAddress: '(0x[\da-f]+)'/gi))routes[match[2].toLowerCase()]=match[1];}
const registry=api('futarchy_api1').data;
const orgs=new Map(registry.organizations.map(o=>[o.id,o]));
const poolRefs=api('futarchy_api4').data.pools;
const quotes=api('futarchy_api11').data.pools;
for(const p of registry.proposalEntities){
 const addr=p.proposalAddress.toLowerCase();if(!routes[addr])continue;
 const meta=JSON.parse(p.metadata||'{}'),org=orgs.get(p.organization.id);
 const pair=['YES','NO'].map(side=>{const ref=poolRefs.find(q=>q.proposal.id.toLowerCase()===addr&&q.type==='CONDITIONAL'&&q.outcomeSide===side);return {name:side==='YES'?'Price if passed':'Price if failed',p:ref?Number(quotes.find(q=>q.id===ref.id)?.price)||null:null};});
 const delta=pair.every(o=>o.p!==null)?(pair[0].p/pair[1].p-1)*100:null;
 add({id:`futarchy-${addr}`,sourceId:addr,product:'futarchy',type:'conditional',chain:chainNames[Number(meta.chain)||100],chainId:Number(meta.chain)||100,title:`${p.displayNameQuestion} ${p.displayNameEvent}`,image:null,asker:asker(org.id,org.name,'DAO',org.id),oracle:{kind:'Reality.eth / Kleros',status:meta.resolution_status||'Unknown',bond:null,finalizeTs:null},state:meta.resolution_status==='resolved'?'Resolved':meta.closeTimestamp&&Number(meta.closeTimestamp)<snapshotTs?'Awaiting answer':'Unknown',pricing:{kind:'conditional',outcomes:pair,headline:{label:'Pass minus fail',value:delta,unit:'%'},quoteUnit:'collateral per governance token'},useIt:{decision:'Decide a DAO proposal',sentence:'Compare pass and fail prices over the proposal’s TWAP window; the DAO still votes.',derived:true},volume:null,liquidity:null,opensTs:meta.startCandleUnix??null,closesTs:Number(meta.closeTimestamp)||null,contract:addr,productUrl:`/futarchy#/market/${routes[addr]}`,liveUrl:`https://futarchy.seer.pm/markets/${addr}`,tradeable:'route',history:[],source:{file:'research/crawl-v3/futarchy_api1.json + futarchy_api4.json + futarchy_api11.json'},metadata:meta});
}
const deep=read('src/products/deep/data/markets-data.json').marketsData;
const charts=read('src/products/deep/data/get-market-charts.json');
const volumes=read('src/products/deep/data/refresh-market-volume.json').data.volumes;
for(const [name,m] of Object.entries(deep).slice(0,30)){
 const id=m.id.toLowerCase(),v=volumes[id];
 const series=charts[id]?.series||[];
 const points=series.find(s=>s.outcomeName==='UP')?.points||[];
 add({id:`deep-${id}`,sourceId:id,product:'deep',type:'originality',chain:'OP Mainnet',chainId:10,title:`How much of ${name} is original work?`,image:null,asker:unknown,oracle:{kind:'Reality.eth / Kleros',status:'Unknown',bond:null,finalizeTs:null},state:'Trading',pricing:{kind:'field',outcomes:[{name:'UP · original work',p:m.upPrice},{name:'DOWN · dependencies',p:m.downPrice}],headline:{label:'Original work share',value:m.upPrice,unit:'share'},notMutuallyExclusiveQuotes:true},useIt:{decision:'Evaluate repository contributions',sentence:'Read UP as the estimated share of original work and DOWN as dependency contribution; compare repository weights.',derived:true},volume:v?Number(v.totalVolumeTokens):null,liquidity:v?Number(v.totalLiquidityTokens):null,amountUnit:'outcome tokens',opensTs:null,closesTs:null,contract:m.id,productUrl:`/deep#/repo/${name}`,tradeable:'route',history:points.map(([ts,value])=>({ts,values:[value],derived:false})),source:{file:'src/products/deep/data/markets-data.json',volumeFile:'src/products/deep/data/refresh-market-volume.json'},repository:name});
}
const opp=api('opportunity_api0').markets;
opp.push(...['opportunity_api1','opportunity_api2','opportunity_api3'].map(api));
for(const raw of opp){
 const m={...raw,chainId:100};const x=base(m,'opportunity');x.asker=asker('seer','Seer','Seer team',m.creator,true);x.type='selection';x.pricing.kind='field';x.tradeable='route';
 const slug=/Rebrand/i.test(m.marketName)?'seer-rebrand-contest':/merch|Devcon/i.test(m.marketName)?'seer-merch-devcon-mumbai':'seer-ai-job-board-name';
 x.productUrl=`/opportunity?market=${slug}`;x.liveUrl=`https://opportunity.seer.pm/markets/100/${m.id}`;
 x.useIt={decision:'Select submissions',sentence:'Use selection prices to prioritize review; the sponsor keeps the final decision.',derived:true};x.source.file='research/crawl-v3/opportunity_api0.json through opportunity_api3.json';x.parentMarket=m.parentMarket; x.routingNote='Demo selects the whole contest; nested extension branches have no separate demo route.';add(x);
}
const risk=api('risk_api6'),riskCharts=api('risk_api4').data;
const identities=[...text('src/products/risk/data/assets.ts').matchAll(/id: '([^']+)', ticker: '([^']+)'/g)];
for(const a of read('src/products/risk/data/asset-snapshot.json')){
 const assetId=identities.find(m=>m[2]===a.ticker)?.[1];if(!assetId)throw Error(`Missing risk identity ${a.ticker}`);
 const index=risk.outcomes.indexOf(a.ticker),token=risk.wrappedTokens[index];
 const candles=riskCharts.find(points=>points[0]?.pool.token0.id===token||points[0]?.pool.token1.id===token)||[];
 add({id:`risk-${assetId}`,sourceId:`${risk.id}:${index}`,product:'risk',type:'yearly-default',chain:'Gnosis',chainId:100,title:`${a.ticker} · yearly probability of default`,image:null,asker:asker('risk-exposure','Exposure assessor (not identified)','Protocol/Treasury',null,true),oracle:{kind:'Reality.eth / Kleros',status:'Awaiting answer',bond:null,finalizeTs:null},state:'Awaiting answer',pricing:{kind:'risk',outcomes:[{name:a.ticker,p:parseFloat(a.marketPd)/100}],headline:{label:'Yearly default probability',value:parseFloat(a.marketPd),unit:'%'},bands:[0,2,5,10,100],grade:a.grade},useIt:{decision:'Assess asset exposure',sentence:'Compare yearly default estimates across assets and review collateral exposure before allocating.',derived:true},volume:null,liquidity:null,opensTs:risk.blockTimestamp,closesTs:risk.openingTs,contract:risk.id,productUrl:`/risk?section=assets&dossier=${assetId}`,liveUrl:'https://foresight.kleros.io/',tradeable:'route',history:candles.map(c=>({ts:Number(c.periodStartUnix),values:[Number(c.pool.token0.id===token?c.token1Price:c.token0Price)],derived:false})),historyUnit:'raw outcome-token price, not annualized PD',source:{file:'src/products/risk/data/asset-snapshot.json',historyFile:'research/crawl-v3/risk_api4.json'},asset:a,token});
}
const askers=[...new Map(ledger.map(m=>[m.asker.id,m.asker])).values()].map(a=>({...a,description:a.derived?'Context derived from the product; the source does not identify an individual requester.':a.kind==='DAO'?'Governance organization named in the captured Futarchy registry.':'Market creator recorded in the saved market response.',avatarColorSeed:crypto.createHash('sha256').update(a.id).digest('hex').slice(0,8)}));
write('ledger.json',ledger);write('askers.json',askers);
write('traders.json',read('apps/explorer-v2/data/get-pnl-leaderboard.json').data.rows);
const profiles=read('src/products/deep/data/profiles-reference.json');
write('agents.json',read('src/products/deep/data/leaderboard-reference.json').map(a=>({...a,id:a.address,name:a.ensName||a.address,classification:'Deep leaderboard participant; automation unverified',profile:profiles[a.address]??null})));
write('leaderboard-periods.json',Object.fromEntries(['1d','1w','1m','all'].map(period=>[period,read(`reference/products/deep/data/leaderboard-${period}.json`)])));
const counts=Object.fromEntries(['seer','futarchy','deep','opportunity','risk'].map(p=>[p,ledger.filter(m=>m.product===p).length]));
write('manifest.json',{compiledAt:'2026-10-26',counts,total:ledger.length,chains:[...new Set(ledger.map(m=>m.chain))],limitations:['No Base market record is present in the supplied captured data.','Deep organizer identity is not supplied; no funder is inferred.','Deep leaderboard entries are participants, not verified automated agents.','Deep token volumes must not be summed with USD volumes.','Missing amounts and quotes remain null.','Reconstructed history is flat and explicitly derived; it asserts no price movement.']});
console.log(JSON.stringify({counts,total:ledger.length,chains:[...new Set(ledger.map(m=>m.chain))]},null,2));
