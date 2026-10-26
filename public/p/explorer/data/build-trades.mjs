import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Offline only. Run from any directory; no network, synthetic feeds, or wallet state.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const ledger = await read('apps/explorer-v3/data/ledger.json');
const lower = value => String(value ?? '').toLowerCase();
const rows = new Map();
const find = (product, id) => ledger.find(m => m.product === product &&
  [m.id, m.sourceId, m.contract].some(value => lower(value) === lower(id)));
const provenance = (file, pointer, note) => ({ file, pointer, label: 'saved sample', note });
function add(market, record) {
  const row = {
    marketId: market.id, product: market.product, outcome: null, side: null,
    trader: { address: null, name: null }, amount: null, unit: null, price: null,
    ts: null, kind: 'liquidity', ...record,
    marketTitle: market.title, chain: market.chain ?? null, chainId: market.chainId ?? null,
    marketKnown: ledger.some(m => m.id === market.id), productUrl: market.productUrl ?? null,
  };
  // Different observations remain distinct; duplicate captures do not inflate counts.
  const { source, ...identity } = row;
  const id = createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 24);
  if (!rows.has(id)) rows.set(id, { id, ...row });
}
function marketFor(product, id, title, extra = {}) {
  return find(product, id) ?? { id: `${product}-${lower(id)}`, product, title, sourceId: id, ...extra };
}
function unwrap(data) {
  if (typeof data.body === 'string') return JSON.parse(data.body);
  return data._endpoint ? data.data : data;
}
// Recover only fully closed JSON values from a truncated response. Never repair a tail.
function closedValue(text, start) {
  const stack = []; let quoted = false; let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
    if (c === '"') { quoted = true; continue; }
    if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') {
      if (stack.pop() !== (c === '}' ? '{' : '[')) return null;
      if (!stack.length) return { value: JSON.parse(text.slice(start, i + 1)), end: i + 1 };
    }
  }
  return null;
}
function tokenInfo(market, token) {
  const index = (market.resolution?.wrappedTokens ?? []).findIndex(t => lower(t) === lower(token));
  return { outcome: market.pricing.outcomes[index]?.name ?? null, outcomeIndex: index < 0 ? null : index, token };
}

const txFile = 'reference/products/explorer/data/get-token-transactions.json';
const capture = await read(txFile);
const transactionMarket = find('seer', new URL(capture._endpoint.replace(/^GET /, '')).searchParams.get('marketId'));
if (!transactionMarket) throw new Error('Captured transaction market is absent from ledger');
let txData = unwrap(capture);
if (txData._raw_truncated) {
  const raw = txData._raw_truncated;
  const holderStart = raw.indexOf('{', raw.indexOf('"topHolders":') + 13);
  const holders = closedValue(raw, holderStart);
  if (!holders) throw new Error('No complete topHolders object');
  const transactions = [];
  let cursor = raw.indexOf('[', raw.indexOf('"recentTransactions":')) + 1;
  while (cursor > 0) {
    while (/\s|,/.test(raw[cursor] ?? '') && cursor < raw.length) cursor++;
    if (raw[cursor] !== '{') break;
    const value = closedValue(raw, cursor);
    if (!value) break;
    transactions.push(value.value); cursor = value.end;
  }
  txData = { topHolders: holders.value, recentTransactions: transactions };
}
for (const [token, holders] of Object.entries(txData.topHolders ?? {})) {
  holders.forEach((holder, index) => add(transactionMarket, {
    ...tokenInfo(transactionMarket, token), kind: 'holder', side: 'hold',
    trader: { address: holder.address, name: null }, amount: holder.balance, unit: 'raw token units',
    source: provenance(txFile, `topHolders.${token}[${index}]`, 'Complete holder object recovered from truncated capture; balance is an integer in raw token units. Price and snapshot time not supplied.'),
  }));
}
for (const [index, tx] of (txData.recentTransactions ?? []).entries()) {
  add(transactionMarket, {
    ...tokenInfo(transactionMarket, tx.token), kind: 'trade', side: 'transfer',
    trader: { address: tx.from, name: null }, counterparty: tx.to, from: tx.from, to: tx.to,
    amount: tx.value, unit: 'raw token units', ts: tx.timestamp ?? null,
    transactionId: tx.id, transactionHash: tx.tx_hash, logIndex: tx.log_index,
    source: provenance(txFile, `recentTransactions[${index}]`, 'Observed token transfer, NOT a confirmed buy or sell. Trader address is the sender, which may be a pool/router or mint address; recipient is counterparty. Incomplete final object excluded.'),
  });
}

// Saved market API pool balances: one observation per pool token, never a wallet holding.
for (const file of ['apps/explorer-v2/data/markets.json', 'reference/products/explorer/data/markets-search.full.json',
  ...['app_api2','app_api3','opportunity_api0','opportunity_api1','opportunity_api2','opportunity_api3'].map(n => `research/crawl-v3/${n}.json`)]) {
  const data = unwrap(await read(file));
  const markets = data.markets ?? (data.id ? [data] : []);
  for (const raw of markets) {
    const product = file.includes('opportunity') ? 'opportunity' : 'seer';
    const market = find(product, raw.id);
    if (!market) continue;
    (raw.poolBalance ?? []).forEach((pool, index) => {
      if (!pool) return;
      for (const side of ['token0', 'token1']) {
        const token = pool[side];
        if (token?.balance == null) continue;
        add(market, { kind: 'liquidity', side: 'pool-snapshot', outcome: raw.outcomes?.[index] ?? null,
          outcomeIndex: index, poolTokenSide: side, amount: token.balance, unit: token.symbol ?? null,
          source: provenance(file, `markets.${raw.id}.poolBalance[${index}].${side}`, 'Saved pool token balance; outcome follows the API poolBalance/outcomes array index. No provider address, execution price or observation timestamp supplied.'),
        });
      }
    });
  }
}

// Registry pools are real records, but contain neither LP amounts nor provider identities.
const poolFile = 'src/products/futarchy/data/captured/pools.json';
const futarchyPools = (await read(poolFile)).pools;
const quotesFile = 'research/crawl-v3/futarchy_api11.json';
const futarchyQuotes = unwrap(await read(quotesFile)).data.pools;
const proposals = (await read('src/products/futarchy/data/captured/registry.json')).data.proposalEntities;
for (const [index, pool] of futarchyPools.entries()) {
  const proposal = proposals.find(p => lower(p.proposalAddress) === lower(pool.proposal.id));
  const market = marketFor('futarchy', pool.proposal.id, proposal?.displayNameEvent ?? proposal?.displayNameQuestion ?? pool.proposal.id, { productUrl: '/futarchy', chain: null, chainId: null });
  const quote = futarchyQuotes.find(q => lower(q.id) === lower(pool.id));
  const conditional = pool.type === 'CONDITIONAL';
  add(market, { kind: 'liquidity', side: 'pool-snapshot', poolId: pool.id, poolType: pool.type,
    outcome: conditional ? (pool.outcomeSide === 'YES' ? 'Price if passed' : 'Price if failed') : `${pool.type} · ${pool.outcomeSide}`,
    outcomeIndex: conditional ? (pool.outcomeSide === 'YES' ? 0 : 1) : null,
    price: quote?.price ?? null, priceUnit: quote?.name ? `quote for ${quote.name}` : null,
    source: { ...provenance(poolFile, `pools[${index}]`, 'Pool registry observation only: liquidity amount and provider not supplied. Price, when supplied, is the captured pool pair quote, not an execution or probability.'), quoteFile: quotesFile },
  });
}

// Deep archived rounds have additional real pools beyond the current 30-market ledger.
const deepFiles = ['src/products/deep/data/markets-data.json', 'src/products/deep/data/zcash-markets-data.json',
  ...(await readdir(path.join(root, 'src/products/deep/data/archive'))).filter(n => n.endsWith('.json')).sort().map(n => `src/products/deep/data/archive/${n}`)];
for (const file of deepFiles) {
  let data = await read(file);
  if (!data.marketsData && data.markets?.marketsData) data = data.markets;
  for (const [name, raw] of Object.entries(data.marketsData ?? {})) {
    const metadata = (Array.isArray(data.markets) ? data.markets : []).find(m => lower(m.id) === lower(raw.id));
    const market = marketFor('deep', raw.id, metadata?.marketName ?? name, { chain: null, chainId: null, productUrl: '/deep' });
    for (const branch of ['up','down','yes','no']) {
      const pool = raw[`${branch}Pool`];
      if (!pool || pool.liquidity == null) continue;
      const index = ['up','yes'].includes(branch) ? 0 : 1;
      const outcome = market.pricing?.outcomes?.[index]?.name ?? metadata?.outcomes?.[index] ?? branch.toUpperCase();
      add(market, { kind: 'liquidity', side: 'pool-snapshot', outcome, outcomeIndex: index,
        poolId: pool.id ?? null, token0: pool.token0 ?? null, token1: pool.token1 ?? null,
        amount: pool.liquidity, unit: 'raw liquidity L', price: raw[`${branch}Price`] ?? pool.price ?? null,
        priceUnit: 'collateral per outcome token',
        source: provenance(file, `marketsData.${name}.${branch}Pool`, 'Concentrated-liquidity L, not shares, dollars, or a wallet position. No provider or snapshot timestamp supplied.'),
      });
    }
  }
}

// Risk history has actual pool liquidity observations; candles alone are not trades.
for (const file of ['reference/products/risk/chart.json', 'src/products/risk/data/pool-snapshot.json', 'research/crawl-v3/risk_api3.json', 'research/crawl-v3/risk_api4.json']) {
  const data = unwrap(await read(file));
  for (const [seriesIndex, series] of (data.data ?? []).entries()) {
    for (const [index, point] of series.entries()) {
      if (!point.pool || point.liquidity == null) continue;
      const market = ledger.find(m => m.product === 'risk' && [point.pool.token0?.id, point.pool.token1?.id].some(t => t && lower(t) === lower(m.token)));
      if (!market) continue;
      const tokenIs1 = lower(point.pool.token1?.id) === lower(market.token);
      add(market, { kind: 'liquidity', side: 'pool-snapshot', outcome: market.pricing.outcomes[0].name,
        outcomeIndex: 0, poolId: point.pool.id, token: market.token,
        amount: point.liquidity, unit: 'raw liquidity L',
        price: (tokenIs1 ? point.token0Price : point.token1Price) ?? null,
        priceUnit: 'collateral per outcome token; not annualized PD', ts: point.periodStartUnix ?? null,
        source: provenance(file, `data[${seriesIndex}][${index}]`, 'Historical pool liquidity observation. Not a wallet position, trade, or add-liquidity event. Raw token quote is not annualized default probability.'),
      });
    }
  }
}

const output = [...rows.values()].sort((a,b) => (b.ts ?? -1) - (a.ts ?? -1) || a.id.localeCompare(b.id));
await writeFile(new URL('./trades.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
for (const product of ['seer','futarchy','deep','opportunity','risk']) {
  const subset = output.filter(row => row.product === product);
  console.log(`${product}: ${subset.length} total; ` + ['trade','position','holder','liquidity'].map(kind => `${kind}=${subset.filter(row => row.kind === kind).length}`).join(', '));
}
console.log(`Total: ${output.length}; transfers=${output.filter(row => row.side === 'transfer').length}; outside current ledger=${output.filter(row => !row.marketKnown).length}`);
