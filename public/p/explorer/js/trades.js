/** Offline saved samples. Await loadTrades() once, then use the synchronous selectors. */
let records = Object.freeze([]);
let pending;
const norm = value => String(value ?? '').trim().toLowerCase();
const identityMatches = (row, id) => norm(row.marketId) === norm(id) || norm(row.marketId).endsWith(`-${norm(id)}`);
const timestamp = row => row.ts == null ? -Infinity : typeof row.ts === 'number' ? row.ts : Date.parse(row.ts) / 1000;

export function loadTrades() {
  if (!pending) {
    pending = fetch(new URL('../data/trades.json', import.meta.url)).then(response => {
      if (!response.ok) throw new Error(`Saved trades could not load (${response.status})`);
      return response.json();
    }).then(data => {
      if (!Array.isArray(data)) throw new TypeError('Saved trades must be an array');
      records = Object.freeze(data.map(row => Object.freeze({ ...row,
        trader: Object.freeze({ ...row.trader }), source: Object.freeze({ ...row.source }),
      })));
      return records;
    }).catch(error => { pending = undefined; throw error; });
  }
  return pending;
}

export function tradesFor(marketId) {
  return marketId == null ? [] : records.filter(row => identityMatches(row, marketId));
}

/** Each real outcome, including unpriced outcomes and additional recorded pool branches. */
export function outcomeRows(market) {
  if (!market?.id) return [];
  const related = tradesFor(market.id);
  const outcomes = (market.pricing?.outcomes ?? market.outcomes ?? []).map((outcome, index) => {
    const value = typeof outcome === 'string' ? { name: outcome } : outcome;
    return { index, name: value.name ?? value.outcome ?? null, price: value.p ?? value.price ?? null };
  });
  for (const row of related) {
    if (row.outcome != null && !outcomes.some(o => norm(o.name) === norm(row.outcome) || (row.outcomeIndex != null && o.index === row.outcomeIndex))) {
      outcomes.push({ index: row.outcomeIndex ?? null, name: row.outcome, price: row.price ?? null });
    }
  }
  return outcomes.map((outcome, index) => {
    const rows = related.filter(row => norm(row.outcome) === norm(outcome.name) ||
      (row.outcomeIndex != null && outcome.index != null && row.outcomeIndex === outcome.index));
    return {
      id: `${market.id}:outcome:${outcome.index ?? `branch-${index}`}`,
      marketId: market.id, index: outcome.index, outcomeIndex: outcome.index,
      name: outcome.name, outcome: outcome.name, price: outcome.price, p: outcome.price,
      unit: market.pricing?.quoteUnit ?? market.pricing?.headline?.unit ?? null,
      token: market.resolution?.wrappedTokens?.[outcome.index] ?? rows.find(row => row.token)?.token ?? null,
      rows, holders: rows.filter(row => row.kind === 'holder'), positions: rows.filter(row => row.kind === 'position'),
      trades: rows.filter(row => row.kind === 'trade'), liquidity: rows.filter(row => row.kind === 'liquidity'),
    };
  });
}

/** filters: product, side, kind, outcome, trader, chain/chainId, marketId, q, offset, limit.
 * Accepts plain objects or URLSearchParams. null/empty/"all" means no filter.
 * Product/side/kind accept arrays or comma-separated choices. Missing times sort last.
 */
export function tape(filters = {}) {
  const get = key => typeof filters?.get === 'function' ? filters.get(key) : filters?.[key];
  const active = value => value != null && norm(value) !== '' && norm(value) !== 'all';
  const oneOf = (actual, filter) => !active(filter) || (Array.isArray(filter) ? filter : String(filter).split(',')).some(value => norm(value) === norm(actual));
  const contains = (value, search) => !active(search) || norm(value).includes(norm(search));
  let result = records.filter(row =>
    ['product','side','kind'].every(key => oneOf(row[key], get(key))) &&
    (!active(get('marketId')) || identityMatches(row, get('marketId'))) &&
    contains(row.outcome, get('outcome')) &&
    contains([row.trader?.address, row.trader?.name, row.counterparty].join(' '), get('trader')) &&
    (!active(get('chain')) || oneOf(row.chain, get('chain')) || oneOf(row.chainId, get('chain'))) &&
    oneOf(row.chainId, get('chainId')) &&
    contains([row.marketTitle, row.marketId, row.outcome, row.trader?.address, row.trader?.name, row.counterparty, row.transactionHash].join(' '), get('q'))
  );
  result.sort((a,b) => timestamp(b) - timestamp(a) || a.id.localeCompare(b.id));
  const offset = Math.max(0, Math.trunc(Number(get('offset')) || 0));
  const limit = active(get('limit')) && Number.isFinite(Number(get('limit'))) ? Math.max(0, Math.trunc(Number(get('limit')))) : result.length;
  return result.slice(offset, offset + limit);
}

/** Exact wallet identity, including received transfers. Pool observations never become wallet exposure. */
export function recordsForAddress(address) {
 const key=norm(address);
 return key ? records.filter(row=>[row.trader?.address,row.counterparty].some(value=>norm(value)===key)) : [];
}
