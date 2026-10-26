export function navTo(path: string) {
  const current = window.location.pathname + window.location.search + window.location.hash;
  if (current === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
