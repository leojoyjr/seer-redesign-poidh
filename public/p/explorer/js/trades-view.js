import {ledger} from './store.js';
/** Pure HTML helpers. All source-derived text is escaped; no DOM or global styles. */
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const text = value => value == null || value === '' ? 'not supplied' : escapeHtml(value);
const short = value => /^0x[\da-f]{40}$/i.test(value ?? '') ? `${value.slice(0,6)}…${value.slice(-4)}` : value;
const safeProduct = value => ['seer','deep','futarchy','opportunity','risk'].includes(value) ? value : 'seer';
const safeUrl = value => typeof value === 'string' && (/^\/(?!\/)/.test(value) || /^https:\/\//.test(value)) ? value : null;
export function marketHref(row) {
  if (row.marketKnown === false) return safeUrl(row.productUrl);
  if (!row.marketId) return null;
  const outcome = row.outcomeIndex ?? row.outcome;
  return `#/m/${encodeURIComponent(row.marketId)}${outcome == null ? '' : `?outcome=${encodeURIComponent(outcome)}`}`;
}
export function renderChip(value, product) {
  return `<span class="trades-chip trades-product-${safeProduct(product)}" style="--trade-icon:url(assets/user/icon-${safeProduct(product)}.svg)">${text(value)}</span>`;
}
export function renderEmpty(message = 'No saved records match.') {
  return `<div class="trades-empty" role="status"><p>${escapeHtml(message)}</p><span>Try another filter.</span></div>`;
}
function timeHtml(ts) {
  if (ts == null) return '<span class="trades-missing">not supplied</span>';
  const date = new Date(typeof ts === 'number' ? ts * 1000 : ts);
  if (Number.isNaN(date.getTime())) return '<span class="trades-missing">not supplied</span>';
  return `<time datetime="${date.toISOString()}">${date.toISOString().slice(0,16).replace('T',' ')} UTC</time>`;
}
export function renderTradeRow(row) {
  const href = marketHref(row);
  const external = row.marketKnown === false;
  const address = row.trader?.address;
  const trader = row.trader?.name ?? short(address);
  const traderHtml = address && !/^0x0{40}$/i.test(address)
    ? `<a class="trades-trader" href="#/t/${encodeURIComponent(address)}" title="${escapeHtml(address)}">${text(trader)}</a>`
    : `<span class="trades-trader">${text(trader)}</span>`;
  const market = ledger.find(m => m.id === row.marketId);
  const image = market?.image ? `<img class="trades-market-image" src="${escapeHtml(market.image)}" alt="" width="48" height="48" loading="lazy" decoding="async">` : `<span class="trades-market-image trades-monogram">${escapeHtml((row.marketTitle || row.product || '').slice(0,2))}</span>`;
  const askerName = market?.asker?.name || '';
  const logo = /ethereum/i.test(askerName)?'ethereum':/optimism/i.test(askerName)?'optimism':/bankless/i.test(askerName)?'bankless':/gitcoin/i.test(askerName)?'gitcoin':/a16z/i.test(askerName)?'a16z':/gnosis/i.test(askerName)?'gnosis':/kleros/i.test(askerName)?'kleros':null;
  const badge = logo ? `<img class="trades-asker-badge" src="assets/user/asker-${logo}.png" alt="" width="20" height="20" loading="lazy" decoding="async">` : askerName ? `<span class="trades-asker-badge trades-monogram">${escapeHtml(askerName.startsWith('0x')?askerName.slice(2,4):askerName.slice(0,2))}</span>` : '';
  const title = row.marketTitle ?? row.marketId;
  const marketHtml = href ? `<a class="trades-market" href="${escapeHtml(href)}"${external ? ' target="_top"' : ''}>${text(title)}${external ? ' ↗' : ''}</a>` : `<span class="trades-market">${text(title)}</span>`;
  const action = row.side === 'pool-snapshot' ? 'Pool snapshot' : row.side === 'transfer' ? 'Token transfer' : row.side;
  const kind = row.kind === 'trade' && row.side === 'transfer' ? 'transfer' : row.kind === 'holder' ? 'holder balance' : row.kind;
  return `<li class="trades-row" data-trade-id="${escapeHtml(row.id)}" data-market-id="${escapeHtml(row.marketId)}" data-outcome="${escapeHtml(row.outcomeIndex ?? row.outcome ?? '')}">
    <div class="trades-identity">${traderHtml}${renderChip(row.product, row.product)}</div>
    <div class="trades-question"><div class="trades-market-art">${image}${badge}</div><div>${marketHtml}<span class="trades-outcome">${text(row.outcome)}</span></div></div>
    <div class="trades-action"><span>${text(action)}</span><span class="trades-meta">${text(kind)}</span></div>
    <div class="trades-size"><span>${text(row.amount)}</span><span class="trades-meta">${text(row.unit)}</span></div>
    <div class="trades-price"><span>${text(row.price)}</span><span class="trades-meta">${text(row.priceUnit ?? (row.price == null ? null : 'price'))}</span></div>
    <div class="trades-time">${timeHtml(row.ts)}<span class="trades-meta">saved sample</span></div>
  </li>`;
}
export function renderTape(rows, { compact = false } = {}) {
  if (!Array.isArray(rows) || !rows.length) return renderEmpty();
  return `<div class="trades-tape${compact ? ' trades-tape-compact' : ''}" aria-label="Saved trades and positions">
    <div class="trades-head" aria-hidden="true"><span>Trader · product</span><span>Market · outcome</span><span>Action</span><span>Size</span><span>Price</span><span>Time · UTC</span></div>
    <ul class="trades-list">${rows.map(renderTradeRow).join('')}</ul>
    <p class="trades-disclosure">Saved sample · Demo preview; trading happens in the product.</p>
  </div>`;
}
