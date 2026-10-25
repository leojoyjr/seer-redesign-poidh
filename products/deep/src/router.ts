import { useMemo, useSyncExternalStore } from 'react';
function subscribe(callback: () => void) { window.addEventListener('hashchange', callback); return () => window.removeEventListener('hashchange', callback); }
export function useRoute() { const hash = useSyncExternalStore(subscribe, () => location.hash || '#/'); return useMemo(()=>{const [path, query = ''] = hash.slice(1).split('?');return { path: path || '/', params: new URLSearchParams(query) };},[hash]); }
export function updateQuery(values: Record<string, string | null>, replace = false) {
  const [path, query = ''] = (location.hash || '#/').slice(1).split('?'); const params = new URLSearchParams(query);
  Object.entries(values).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
  const hash = `#${path}${params.size ? `?${params}` : ''}`;
  if (hash === location.hash) return;
  if (replace) { history.replaceState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); } else { history.pushState(null, '', hash); window.dispatchEvent(new HashChangeEvent('hashchange')); }
}
