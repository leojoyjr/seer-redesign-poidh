import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { navTo } from '../../seer-2026/lib/nav';
import {
  adaptProductFrame,
  disconnectProductWallet,
  requestProductWallet,
  syncProductFrameTheme,
  type ProductId,
  type SeerTheme,
} from './embedAdapter';
import './ProductShell.css';

const logo = new URL('../../../assets/brand/logo.svg', import.meta.url).href;

const PRODUCTS: Record<ProductId, { name: string; route: string; description: string; image: string }> = {
  explorer: { name: 'Seer App', route: '/explorer', description: 'Explore and trade every market', image: '/img/monument/p-seer.webp' },
  deep: { name: 'Deep', route: '/deep', description: 'Many-outcome markets for people and agents', image: '/img/monument/p-deep.webp' },
  futarchy: { name: 'Futarchy', route: '/futarchy', description: 'Decisions priced before the vote', image: '/img/monument/p-futarchy.webp' },
  opportunity: { name: 'Opportunity Markets', route: '/opportunity', description: 'Odds that shortlist submissions', image: '/img/monument/p-opportunity.webp' },
  risk: { name: 'Risk Pricing', route: '/risk', description: 'Protocol risk, side by side', image: '/img/monument/p-risk.webp' },
};

const PRODUCT_ORDER = Object.keys(PRODUCTS) as ProductId[];

function isPlainClick(event: ReactMouseEvent<HTMLAnchorElement>) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function shortAddress(address: string) {
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function ArrowIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9m-4-4 4 4-4 4" /></svg>;
}

function ThemeIcon() {
  return <span className="ps-theme-morph" aria-hidden="true"><svg className="ps-sun" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3.2" /><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M15.8 4.2l-1.4 1.4M5.6 14.4l-1.4 1.4" /></svg><svg className="ps-moon" viewBox="0 0 20 20"><path d="M16.8 12.7A7 7 0 0 1 7.3 3.2 7 7 0 1 0 16.8 12.7Z" /></svg></span>;
}

function WalletGlyph() {
  return <span className="ps-wallet-glyph" aria-hidden="true"><i /><i /><i /><i /></span>;
}

export function ProductShell({ product }: { product: ProductId }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const appsRoot = useRef<HTMLDivElement>(null);
  const walletRoot = useRef<HTMLDivElement>(null);
  const appsButton = useRef<HTMLButtonElement>(null);
  const walletButton = useRef<HTMLButtonElement>(null);
  const firstApp = useRef<HTMLAnchorElement>(null);
  const firstWalletAction = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<number>(0);
  const adapterTimers = useRef<number[]>([]);
  const [appsOpen, setAppsOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [readyProduct, setReadyProduct] = useState<ProductId | null>(null);
  const [theme, setTheme] = useState<SeerTheme>(() => {
    try { return localStorage.getItem('seer.theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  });

  const current = PRODUCTS[product];
  const otherProducts = useMemo(() => PRODUCT_ORDER.filter((id) => id !== product), [product]);
  const BUNDLE: Record<ProductId, string> = { explorer: 'explorer', deep: 'deep-v2', futarchy: 'futarchy', opportunity: 'opportunity', risk: 'risk' };
  // the explorer hands native-Seer trading off to the trading app via /explorer?v=2#/market/<id>
  const bundleFor = (search: string) => (product === 'explorer' && new URLSearchParams(search).get('v') === '2' ? 'explorer-v2' : BUNDLE[product]);
  const frameUrl = (search: string, hash: string) => `/p/${bundleFor(search)}/index.html${bundleFor(search) === 'explorer-v2' ? '' : search}${hash}`;
  const [frameSrc, setFrameSrc] = useState(() => frameUrl(window.location.search, window.location.hash));
  useEffect(() => { setFrameSrc(frameUrl(window.location.search, window.location.hash)); }, [product]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // deep links to the same product (e.g. /deep#/repo/a/b) re-point the frame without remounting the shell
    const onPop = () => {
      const next = frameUrl(window.location.search, window.location.hash);
      const frame = iframe.current;
      if (!frame) return;
      const here = frame.contentWindow?.location;
      const same = here && (here.pathname + here.search + here.hash) === next;
      if (!same) { if (here && here.pathname === `/p/${bundleFor(window.location.search)}/index.html`) { frame.contentWindow!.location.replace(next); } else setFrameSrc(next); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTheme = useCallback((next: SeerTheme) => setTheme((value) => value === next ? value : next), []);
  const runAdapter = useCallback(() => {
    if (!iframe.current) return false;
    return adaptProductFrame(iframe.current, { product, theme, onThemeChange: updateTheme, onWalletChange: setAddress, keepCrossLinks: product === 'explorer' && new URLSearchParams(window.location.search).get('v') !== '2', onNavigate: (route) => { setAppsOpen(false); navTo(route); } });
  }, [product, theme, updateTheme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('seer.theme', theme); } catch { /* Theme still applies to the live shell. */ }
    if (iframe.current) syncProductFrameTheme(iframe.current, theme);
  }, [theme]);

  useEffect(() => {
    adapterTimers.current.forEach(window.clearTimeout);
    adapterTimers.current = [];
    setReadyProduct(null);
    setAppsOpen(false);
    setWalletOpen(false);
    document.title = `${current.name} | Seer`;
    return () => {
      adapterTimers.current.forEach(window.clearTimeout);
      adapterTimers.current = [];
    };
  }, [current.name, product]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (appsOpen && !appsRoot.current?.contains(event.target as Node)) setAppsOpen(false);
      if (walletOpen && !walletRoot.current?.contains(event.target as Node)) setWalletOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (walletOpen) walletButton.current?.focus();
      else if (appsOpen) appsButton.current?.focus();
      setAppsOpen(false);
      setWalletOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, [appsOpen, walletOpen]);

  useEffect(() => {
    if (walletOpen) firstWalletAction.current?.focus();
  }, [walletOpen]);

  const onFrameLoad = () => {
    adapterTimers.current.forEach(window.clearTimeout);
    const adapt = () => { if (runAdapter()) setReadyProduct(product); };
    adapt();
    adapterTimers.current = [window.setTimeout(adapt, 400), window.setTimeout(adapt, 1200)];
  };

  const go = (event: ReactMouseEvent<HTMLAnchorElement>, route: string) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    setAppsOpen(false);
    navTo(route);
  };

  const showApps = () => { window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setAppsOpen(true), 90); };
  const hideApps = () => { window.clearTimeout(hoverTimer.current); hoverTimer.current = window.setTimeout(() => setAppsOpen(false), 220); };
  const toggleWallet = () => {
    if (address) setWalletOpen((open) => !open);
    else if (iframe.current) requestProductWallet(iframe.current);
  };
  const copyAddress = async () => {
    if (!address) return;
    try { await navigator.clipboard.writeText(address); setCopied(true); window.setTimeout(() => setCopied(false), 1000); } catch { setCopied(false); }
  };
  const disconnect = () => {
    if (iframe.current) disconnectProductWallet(iframe.current);
    setAddress(null);
    setWalletOpen(false);
  };

  return (
    <div className="ps-shell" data-theme={theme}>
      <header className="ps-bar">
        <div className="ps-left">
          <a className="ps-logo" href="/seer-2026" aria-label="Seer home" onClick={(event) => go(event, '/seer-2026')}><img src={logo} alt="" /></a>
          <span className="ps-divider" aria-hidden="true" />
          <span className="ps-product"><i aria-hidden="true" />{current.name}</span>
        </div>
        <div className="ps-actions">
          <div className={`ps-apps${appsOpen ? ' is-open' : ''}`} ref={appsRoot} onPointerEnter={showApps} onPointerLeave={hideApps} onFocus={showApps} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) hideApps(); }}>
            <button ref={appsButton} className="ps-apps-button" type="button" aria-expanded={appsOpen} aria-haspopup="menu" aria-controls="ps-apps-panel" onClick={() => setAppsOpen((open) => !open)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setAppsOpen(true); requestAnimationFrame(() => firstApp.current?.focus()); } }}>Apps<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.2 6 8l4-3.8" /></svg></button>
            <div className="ps-apps-panel" id="ps-apps-panel" role="menu" aria-label="Other Seer apps" onKeyDown={(event) => {
              const items = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]'));
              const index = items.indexOf(document.activeElement as HTMLAnchorElement);
              if (event.key === 'ArrowDown') { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
              if (event.key === 'ArrowUp') { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
            }}>
              {otherProducts.map((id, index) => { const item = PRODUCTS[id]; return <a key={id} ref={index === 0 ? firstApp : undefined} className="ps-app-row" role="menuitem" href={item.route} style={{ '--ps-index': index } as React.CSSProperties} onClick={(event) => go(event, item.route)}><img src={item.image} alt="" /><span><b>{item.name}</b><em>{item.description}</em></span><ArrowIcon /></a>; })}
            </div>
          </div>
          <button className="ps-icon-button ps-theme" type="button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')}><ThemeIcon /></button>
          <div className="ps-wallet-wrap" ref={walletRoot}>
            <button ref={walletButton} className={`ps-wallet${address ? ' is-connected' : ''}`} type="button" aria-haspopup={address ? 'menu' : 'dialog'} aria-expanded={address ? walletOpen : undefined} aria-label={address ? `Wallet ${shortAddress(address)}` : 'Connect Wallet'} onClick={toggleWallet}><span className="ps-wallet-fill" aria-hidden="true" /><WalletGlyph /><span className="ps-wallet-label">{address ? shortAddress(address) : 'Connect Wallet'}</span></button>
            {address && walletOpen && <div className="ps-wallet-menu" role="menu" onKeyDown={(event) => { if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return; event.preventDefault(); const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')); const index = items.indexOf(document.activeElement as HTMLButtonElement); items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }}><div>{shortAddress(address)}</div><button ref={firstWalletAction} type="button" role="menuitem" onClick={copyAddress}>{copied ? 'Copied' : 'Copy address'}</button><button type="button" role="menuitem" onClick={disconnect}>Disconnect</button></div>}
          </div>
        </div>
      </header>
      <main className="ps-frame-wrap" data-ready={readyProduct === product ? 'true' : 'false'}>
        <iframe ref={iframe} src={frameSrc} title={`${current.name} application`} allow="clipboard-write" onLoad={onFrameLoad} />
      </main>
    </div>
  );
}

export type { ProductId } from './embedAdapter';
