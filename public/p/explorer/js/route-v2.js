// Shell routes belong to the parent; standalone deployments may omit explorer-v2.
export const embedded = (() => { try { return self !== top; } catch { return true; } })();
const hasLocal = false;
const base = embedded ? '/explorer?v=2' : 'https://app.seer.pm';
export const tradeUrl = m => embedded || hasLocal ? `${base}#/market/${encodeURIComponent(m.sourceId || m.id)}` : `https://app.seer.pm/markets/${m.chainId}/${m.contract || m.sourceId}`;
export const productUrl = url => {
 if (!url || !url.startsWith('/')) return url;
 if (embedded) return url;
 if (url.startsWith('/explorer')) return marketsUrl();
 return 'https://seer-redesign-2026.vercel.app' + url;
};
export const createUrl = () => embedded || hasLocal ? `${base}#/create` : `${base}/create-market`;
export const leaderboardUrl = () => embedded || hasLocal ? `${base}#/leaderboard` : `${base}/leaderboard`;
export const marketsUrl = () => embedded || hasLocal ? `${base}#/` : base;
export const isNative = m => m.product === 'seer';
export const handoffAttrs = () => embedded ? ' target="_top"' : ' target="_blank" rel="noopener"';
export const handoffLabel = m => m ? 'Trade this market in Seer' : 'Create a market in Seer';
// Normalize all product hand-offs, including links rendered by secondary pages.
export function normalizeHandoffs(root=document) {
 root.querySelectorAll('a[href]').forEach(a => {
  const href=a.getAttribute('href');
  if (/^\/(explorer|deep|futarchy|opportunity|risk)([/?#]|$)/.test(href)) a.href=productUrl(href);
  if (/^\/(explorer|deep|futarchy|opportunity|risk)([/?#]|$)/.test(href) || /^(https:\/\/app.seer.pm|https:\/\/seer-redesign-2026.vercel.app|\.\.\/explorer-v2)/.test(a.getAttribute('href'))) {
   a.target=embedded?'_top':'_blank'; if(!embedded)a.rel='noopener';
  }
 });
}

// Late-rendered panels and rankings share the same hand-off policy.
if (typeof MutationObserver !== 'undefined') {
 const observer=new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){
   if(node.matches?.('a[href]'))normalizeHandoffs(node.parentElement);
   else normalizeHandoffs(node);
  }
 });
 observer.observe(document.body,{childList:true,subtree:true});
}
