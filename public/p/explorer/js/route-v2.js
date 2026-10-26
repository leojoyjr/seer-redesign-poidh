// Hand-off from the explorer (v3) to the full Seer trading app (explorer-v2) for native Seer markets.
// v2 owns trading, quotes and market creation; v3 owns discovery and understanding.
const embedded = (() => { try { return self !== top; } catch { return true; } })();
const base = embedded ? '/explorer?v=2' : '/p/explorer-v2/index.html';
export const tradeUrl = (m) => `${base}#/market/${encodeURIComponent(m.sourceId || String(m.id).replace(/^seer-\d+-/, ''))}`;
export const createUrl = () => `${base}#/create`;
export const leaderboardUrl = () => `${base}#/leaderboard`;
export const isNative = (m) => m.product === 'seer';
/** Attributes for an <a> that leaves the framed explorer for the trading app. */
export const handoffAttrs = () => (embedded ? ' target="_top"' : '');
export const handoffLabel = (m) => (m ? 'Trade this market in Seer' : 'Create a market in Seer');
export const marketsUrl = () => `${base}#/`;
