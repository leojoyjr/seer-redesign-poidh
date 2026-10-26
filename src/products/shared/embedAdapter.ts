export type ProductId = 'explorer' | 'deep' | 'futarchy' | 'opportunity' | 'risk';
export type SeerTheme = 'light' | 'dark';

const WALLET_KEY = 'seer.wallet';
const PRODUCT_IDS: ProductId[] = ['explorer', 'deep', 'futarchy', 'opportunity', 'risk'];

interface SeerShellWindow extends Window {
  seerShell?: {
    setConnected?: (address: string | null) => void;
  };
}

interface AdapterOptions {
  product: ProductId;
  theme: SeerTheme;
  onThemeChange: (theme: SeerTheme) => void;
  onWalletChange: (address: string | null) => void;
  keepCrossLinks?: boolean;
  onNavigate?: (route: string) => void;
}

interface AdapterState {
  document: Document;
  window: SeerShellWindow;
  observer: MutationObserver;
  walletTimer: number;
  themeListener: EventListener;
  options: AdapterOptions;
}

const states = new WeakMap<HTMLIFrameElement, AdapterState>();

const EMBED_CSS = `
:root { --seer-header-h: 0px !important; }
html body > header#header.sb, html body .sb { top: 0 !important; margin-top: 0 !important; }
html body { padding-top: 0 !important; }
html body .ix-tools { top: 56px !important; }
html body #root { height: 100dvh !important; }
html body .guide-drawer, html body .chart-expanded { top: 0 !important; height: 100dvh !important; max-height: 100dvh !important; }
html body .ix-panel { top: 72px !important; max-height: calc(100dvh - 88px) !important; }
[data-testid="header-wallet"], [data-testid="top-bar"] button[aria-label*="theme" i], [data-testid="top-bar"] button[title*="theme" i], [data-testid="top-bar"] button[aria-label*="mode" i], [data-testid="top-bar"] .theme-toggle { display: none !important; }
html body > main#app { scroll-margin-top: 0 !important; }
#seer-global-header { display: none !important; }
html body [data-seer-embed-hidden="true"], html body a[data-seer-embed-hidden="true"] { display: none !important; visibility: hidden !important; pointer-events: none !important; }
`;

function productFromHref(anchor: HTMLAnchorElement): ProductId | null {
  const raw = anchor.getAttribute('href')?.trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return null;

  try {
    const url = new URL(raw, anchor.ownerDocument.baseURI);
    if (url.hostname === 'opportunity.seer.pm') return 'opportunity';
    if (url.hostname === 'app.seer.pm') return 'explorer';

    const path = url.pathname.toLowerCase();
    const bundle = path.match(/\/p\/(explorer|deep|futarchy|opportunity|risk)(?:\/|$)/)?.[1];
    if (bundle && PRODUCT_IDS.includes(bundle as ProductId)) return bundle as ProductId;

    for (const id of PRODUCT_IDS) {
      if (new RegExp(`/(?:${id})(?:/|$)`).test(path)) return id;
    }
  } catch {
    return null;
  }

  return null;
}

function hideCrossProductLinks(document: Document, current: ProductId, keep = false) {
  if (keep) return;
  document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((anchor) => {
    const target = productFromHref(anchor);
    if (target && target !== current) anchor.dataset.seerEmbedHidden = 'true';
  });

  document.querySelectorAll<HTMLElement>('footer nav, footer ul, footer [class*="apps"], footer [class*="product"]').forEach((list) => {
    const links = Array.from(list.querySelectorAll<HTMLAnchorElement>('a[href]'));
    if (links.some((link) => {
      const target = productFromHref(link);
      return target !== null && target !== current;
    })) list.dataset.seerEmbedHidden = 'true';
  });

  document.querySelectorAll<HTMLElement>('footer').forEach((footer) => {
    const productLinks = Array.from(footer.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .map((link) => productFromHref(link))
      .filter((target): target is ProductId => target !== null);
    if (productLinks.length > 1 && productLinks.some((target) => target !== current)) {
      footer.dataset.seerEmbedHidden = 'true';
    }
  });
}

function syncTheme(state: AdapterState, theme: SeerTheme) {
  const { document, window } = state;
  try {
    window.localStorage.setItem('seer.theme', theme);
  } catch {
    // Storage can be unavailable in hardened browser contexts; the DOM event still syncs the app.
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('light', theme === 'light');
  const event = document.createEvent('CustomEvent');
  event.initCustomEvent('seer:theme', false, false, { theme });
  window.dispatchEvent(event);
}

function readWallet(window: Window) {
  try {
    return window.sessionStorage.getItem(WALLET_KEY);
  } catch {
    return null;
  }
}

function destroyState(state: AdapterState) {
  state.observer.disconnect();
  state.window.clearInterval(state.walletTimer);
  state.window.removeEventListener('seer:theme', state.themeListener);
}

export function adaptProductFrame(iframe: HTMLIFrameElement, options: AdapterOptions) {
  const document = iframe.contentDocument;
  const window = iframe.contentWindow as SeerShellWindow | null;
  if (!document?.documentElement || !window) return false;

  let state = states.get(iframe);
  if (state && state.document !== document) {
    destroyState(state);
    states.delete(iframe);
    state = undefined;
  }

  if (!state) {
    let style = document.getElementById('seer-embed') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'seer-embed';
      style.textContent = EMBED_CSS;
      document.head.appendChild(style);
    }

    const observer = new MutationObserver(() => hideCrossProductLinks(document, state?.options.product ?? options.product, state?.options.keepCrossLinks));
    const themeListener: EventListener = (event) => {
      const next = (event as CustomEvent<{ theme?: string }>).detail?.theme;
      if (next === 'light' || next === 'dark') state?.options.onThemeChange(next);
    };

    state = {
      document,
      window,
      observer,
      walletTimer: 0,
      themeListener,
      options,
    };
    states.set(iframe, state);

    const clickListener = (event: Event) => {
      const me = event as MouseEvent;
      if (me.defaultPrevented || me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;
      const anchor = (me.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || !state?.options.keepCrossLinks || !state.options.onNavigate) return;
      let ext: URL | null = null;
      try { ext = new URL(anchor.getAttribute('href') || '', anchor.ownerDocument.baseURI); } catch { /* ignore */ }
      if (ext && ext.hostname !== window.location.hostname && /^https?:$/.test(ext.protocol) && anchor.target === '_top') {
        me.preventDefault(); window.open(ext.href, '_blank', 'noopener'); return; // never replace the app window with an outside site
      }
      const target = productFromHref(anchor);
      if (!target) return;
      if (target === state.options.product && anchor.target !== '_top') return;
      let url: URL;
      try { url = new URL(anchor.getAttribute('href') || '', anchor.ownerDocument.baseURI); } catch { return; }
      if (url.hostname !== window.location.hostname) return; // external hosts open normally
      me.preventDefault();
      state.options.onNavigate(`/${target}${url.search}${url.hash}`);
    };
    document.addEventListener('click', clickListener, true);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('seer:theme', themeListener);
    state.walletTimer = window.setInterval(() => {
      state?.options.onWalletChange(readWallet(window));
      const embeddedTheme = document.documentElement.dataset.theme;
      if (embeddedTheme === 'light' || embeddedTheme === 'dark') state?.options.onThemeChange(embeddedTheme);
    }, 600);
  } else {
    state.options = options;
  }

  hideCrossProductLinks(document, options.product, options.keepCrossLinks);
  syncTheme(state, options.theme);
  options.onWalletChange(readWallet(window));
  return true;
}

export function syncProductFrameTheme(iframe: HTMLIFrameElement, theme: SeerTheme) {
  const state = states.get(iframe);
  if (state) syncTheme(state, theme);
}

export function requestProductWallet(iframe: HTMLIFrameElement) {
  const window = iframe.contentWindow;
  if (!window) return;
  const event = window.document.createEvent('CustomEvent');
  event.initCustomEvent('seer:connect', false, true, undefined);
  window.dispatchEvent(event);
}

export function disconnectProductWallet(iframe: HTMLIFrameElement) {
  const window = iframe.contentWindow as SeerShellWindow | null;
  if (!window) return;
  try {
    window.sessionStorage.removeItem(WALLET_KEY);
  } catch {
    // The bridge still notifies the embedded shell when storage is unavailable.
  }
  window.seerShell?.setConnected?.(null);
  const event = window.document.createEvent('CustomEvent');
  event.initCustomEvent('seer:disconnect', false, false, undefined);
  window.dispatchEvent(event);
}
