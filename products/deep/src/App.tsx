import { useCallback, useEffect, useRef, useState } from 'react';
import { markets as initialMarkets } from './data/markets';
import { useRoute, updateQuery } from './router';
import { Masthead } from './components/Masthead';
import { SplitList } from './components/SplitList';
import { Swarm } from './components/Swarm';
import { Icon, type IconName } from './components/Icon';
import { Inspector } from './components/Inspector';
import { TimeFigure } from './components/TimeFigure';
import { Predictions } from './components/Predictions';
import { Funds, Profile, type ProfileData } from './components/Dialogs';
import { START, END, series } from './data/series';
import { Leaderboard } from './components/Leaderboard';
import { Detail } from './components/Detail';
import { contestById } from './data/contests';
import { ContestMarket, ContestOverview } from './components/ContestMarket';
import { Search } from './components/Search';
import { Guide } from './components/Guide';
import { MarketSections, SectionNav } from './components/MarketSections';
import { AnimatedValue } from './components/AnimatedValue';
import { useSlidingControls } from './useSlidingControls';
import { SidewaysComparison } from './components/SidewaysComparison';
import { LeaderboardPodium } from './components/LeaderboardPodium';

export default function App() {
  useSlidingControls();
  const [sideways, setSideways] = useState(false);
  const [guide, setGuide] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [compare, setCompare] = useState(false);
  const [compareHover, setCompareHover] = useState<string | null>(null);
  useEffect(() => {
    if (!compare) { setCompareHover(null); return; }
    requestAnimationFrame(() => chartRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }, [compare]);
  const [deskOverlay, setDeskOverlay] = useState(false);
  const [bubble, setBubble] = useState('');
  const [dock, setDock] = useState('desk');
  const [mobile, setMobile] = useState('chart');
  const [selected, setSelected] = useState(initialMarkets[0]);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ribbon = document.querySelector<HTMLElement>('.selected-trade-card');
    const animation = ribbon?.animate([{ opacity: .55 }, { opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.16,1,.3,1)' });
    return () => animation?.cancel();
  }, [selected.id]);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.masthead');
    if (!bar) return;
    const sync = () => {
      const shell = document.getElementById('seer-global-header');
      document.documentElement.style.setProperty('--content-top', `${(shell?.getBoundingClientRect().height || 64) + bar.getBoundingClientRect().height}px`);
    };
    const observer = new ResizeObserver(sync);
    observer.observe(bar); sync();
    window.addEventListener('scroll', sync, {passive:true});
    window.addEventListener('resize', sync);
    return () => {observer.disconnect(); window.removeEventListener('scroll',sync); window.removeEventListener('resize',sync);};
  }, []);


  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if ((event.target as HTMLElement).closest('dialog[open]')) return;
        setExpanded(false); setBubble(''); setCompare(false); setDeskOverlay(false);
        return;
      }
      if ((event.target as HTMLElement).closest('dialog[open],input,textarea,select,[contenteditable=true]')) return;
      if (event.key.toLowerCase() === 'c' && !event.metaKey && !event.ctrlKey && !event.altKey) { event.preventDefault(); setSideways(true); }
      if (event.key.toLowerCase() === 'f') setExpanded(value => !value);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const before = document.activeElement as HTMLElement | null;
    const background = Array.from(document.querySelectorAll<HTMLElement>('#seer-global-header,.masthead,.contest-band,.desk,.repository-box,.mobile-tabs,.market-sections,.section-nav'));
    background.forEach(element => element.inert = true);
    const chart = chartRef.current;
    const controls = () => Array.from(chart?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"],input:not(:disabled),summary,a[href]') ?? []);
    controls()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const all = controls().filter(element => element.getClientRects().length > 0), first = all[0], last = all[all.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    chart?.addEventListener('keydown', trap);
    return () => {
      chart?.removeEventListener('keydown', trap);
      background.forEach(element => element.inert = false);
      before?.focus();
    };
  }, [expanded]);

  const { path, params } = useRoute();
  const [connected, setConnected] = useState(false);
  const [markets, setMarkets] = useState(initialMarkets);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const apply = (theme: string) => {
      const root = document.documentElement;
      root.dataset.theme = theme === 'light' ? 'light' : 'dark';
      root.classList.toggle('light', theme === 'light');
    };
    let saved = 'dark';
    try { saved = localStorage.getItem('seer.theme') === 'light' ? 'light' : 'dark'; } catch { /* storage may be unavailable */ }
    apply(saved);
    const onTheme = (event: Event) => apply((event as CustomEvent).detail?.theme);
    window.addEventListener('seer:theme', onTheme);
    return () => window.removeEventListener('seer:theme', onTheme);
  }, []);

  const [walletError, setWalletError] = useState('');
  useEffect(() => {
    (window as Window & { seerShell?: { setConnected?: (address: string | null) => void } }).seerShell?.setConnected?.(connected ? '0x0000…dEaD' : null);
  }, [connected]);
  const mockProvider = () => (window as Window & { ethereum?: { __calls?: unknown[]; request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  const connectWallet = async () => {
    try {
      const provider = mockProvider();
      if (provider?.__calls) await provider.request({ method: 'eth_requestAccounts' });
      setConnected(true);
      setWalletError('');
    } catch { setWalletError('Wallet connection rejected'); }
  };
  const connectedRef = useRef(false);
  connectedRef.current = connected;
  useEffect(() => {
    const onConnect = (event: Event) => {
      (event as Event & { seerHandled?: boolean }).seerHandled = true;
      if (!connectedRef.current) void connectWallet();
    };
    window.addEventListener('seer:connect', onConnect);
    return () => window.removeEventListener('seer:connect', onConnect);
  }, []);

  const [cash, setCash] = useState({ USDC: 1000, USDS: 1000 });
  const [trade, setTrade] = useState(false);
  const [creating, setCreating] = useState(false);
  const [balance, setBalance] = useState(0);
  const [holdings, setHoldings] = useState(0);
  const [funds, setFunds] = useState(false);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [progress, setProgress] = useState(-1);
  const [hidden, setHidden] = useState(false);
  const [t, setT] = useState(END);
  const [playing, setPlaying] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayLoop, setReplayLoop] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(() => {
    try { return JSON.parse(localStorage.getItem('deep-profile') || 'null') ?? { name: '', picture: '', x: '' }; }
    catch { return { name: '', picture: '', x: '' }; }
  });

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const started = performance.now();
    const from = t;
    const tick = (now: number) => {
      const duration = 12000 * (END - from) / (END - START) / replaySpeed || 1;
      const fraction = Math.min(1, (now - started) / duration);
      setT(from + (END - from) * fraction);
      if (fraction < 1) frame = requestAnimationFrame(tick);
      else if (replayLoop && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setT(START);
        setGeneration(value => value + 1);
      } else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, generation, replaySpeed, replayLoop]);
  useEffect(() => { (window as Window & { __replayT?: number }).__replayT = t; }, [t]);
  useEffect(() => {
    if (progress < 0) return;
    const ids = Object.keys(predictions);
    if (progress >= ids.length) return;
    const timer = setTimeout(() => {
      setProgress(progress + 1);
      if (progress + 1 === ids.length) { setHoldings(value => value + balance); setBalance(0); }
    }, 140);
    return () => clearTimeout(timer);
  }, [progress, predictions, balance]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => { if (media.matches) { setT(END); setPlaying(false); } };
    media.addEventListener('change', stop);
    return () => media.removeEventListener('change', stop);
  }, []);

  const replay = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setT(END); setPlaying(false); }
    else { setT(START); setPlaying(true); setGeneration(value => value + 1); }
  };
  const scrub = (value: number) => { setPlaying(false); setT(value); };
  const liveMarkets = markets.map(market => {
    if (t === END) return market;
    const interpolate = (points: typeof series[string]['up']) => {
      let index = 0;
      while (index < points.length - 1 && points[index + 1].t <= t) index++;
      return points[index].value;
    };
    const up = interpolate(series[market.id].up), down = interpolate(series[market.id].down);
    return { ...market, up, down, sum: up + down, residual: 1 - up - down };
  });
  const round = params.get('round') ?? 'round3';
  const fail = params.get('fail') === '1' || new URLSearchParams(location.search).get('fail') === '1';
  useEffect(() => { const timer = setTimeout(() => setLoading(false), 420); return () => clearTimeout(timer); }, []);
  useEffect(() => { document.querySelector('.workspace-scroll')?.scrollTo(0, 0); }, [path]);
  const retry = useCallback(() => {
    const url = new URL(location.href);
    url.searchParams.delete('fail');
    history.replaceState(null, '', url);
    updateQuery({ fail: null });
    setLoading(true);
    setTimeout(() => setLoading(false), 420);
  }, []);
  const market = path.startsWith('/repo/') ? markets.find(item => item.name.toLowerCase() === decodeURIComponent(path.slice(6)).toLowerCase()) : undefined;
  const selectedLive = liveMarkets.find(item => item.id === (compare ? selected.id : params.get('iso') || selected.id)) ?? selected;
  const selectRepository = (id: string) => {
    const item = liveMarkets.find(item => item.id === id);
    if (!item) return;
    setSelected(item); setCompare(true); setDeskOverlay(false);
    updateQuery({iso:id}, true);
  };
  const focusDesk = () => {
    setDock('desk');
    setDeskOverlay(true);
    setMobile('desk');
    setTimeout(() => document.querySelector<HTMLElement>('[data-testid="start-trading"]')?.focus(), 40);
  };

  const chartControls = <div data-testid="view-switch" role="tablist" aria-label="Chart view" className="chart-view segmented">
    <button data-testid="view-tab-split" role="tab" aria-selected={params.get('view') !== 'swarm'} aria-pressed={params.get('view') !== 'swarm'} aria-current={params.get('view') !== 'swarm' ? 'true' : undefined} title={params.get('view') !== 'swarm' ? 'Current' : undefined} onClick={() => updateQuery({ view: 'split' })}>Split</button>
    <button data-testid="view-tab-swarm" role="tab" aria-selected={params.get('view') === 'swarm'} aria-pressed={params.get('view') === 'swarm'} aria-current={params.get('view') === 'swarm' ? 'true' : undefined} title={params.get('view') === 'swarm' ? 'Current' : undefined} onClick={() => updateQuery({ view: 'swarm' })}>Swarm</button>
    <button className="expand-control" onClick={() => setExpanded(!expanded)}><Icon name={expanded ? 'close' : 'expand'} size={16}/>{expanded ? 'Close · Esc' : 'Expand · F'}</button>
  </div>;

  const rootMarket = <div className="rail-layout"><SectionNav openPanel={compare ? setBubble : undefined} openCompare={() => setSideways(true)}/><div className={`terminal market-workspace ${compare ? 'compare-mode' : ''}`}>
    {compare && <aside className="compare-list" aria-label="Compare repositories"><header><h2>Compare</h2><button onClick={() => {setCompare(false); setDeskOverlay(false); setBubble(''); updateQuery({iso:null},true);}}>Exit compare</button></header><div className="compare-repositories">{[...liveMarkets].filter(item=>item.name.toLowerCase().includes((params.get('q') || '').toLowerCase())).sort((a,b)=>b.up-a.up).map((item,index)=>{const delta=item.up-series[item.id].up[0].value;return <button key={item.id} aria-pressed={item.id===selected.id} title={item.name} onClick={()=>selectRepository(item.id)} onMouseEnter={()=>setCompareHover(item.id)} onMouseLeave={()=>setCompareHover(null)} onFocus={()=>setCompareHover(item.id)} onBlur={()=>setCompareHover(null)} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault(); const next=event.key==='ArrowDown'?event.currentTarget.nextElementSibling:event.currentTarget.previousElementSibling;(next as HTMLButtonElement|null)?.focus();(next as HTMLButtonElement|null)?.click();}}}><span>{index+1}</span><span className="compare-name">{item.name}</span><strong>{item.up.toFixed(4)}</strong><span className={delta<0?'loss':'gain'}>{delta>=0?'+':''}{delta.toFixed(3)}</span></button>;})}</div></aside>}
    {compare && <button className="desk-bubble primary" aria-label={`Open trading desk for ${selectedLive.name}`} aria-expanded={deskOverlay} onClick={()=>setDeskOverlay(value=>!value)}><Icon name="desk"/><span>{selectedLive.repo.slice(0,2).toUpperCase()}</span></button>}
    <div className="chart-column workspace-scroll">
      <div className="workspace-inner">
        {expanded && <div className="chart-scrim" onClick={()=>setExpanded(false)}/>}
        <div onClick={event=>{const target=(event.target as Element).closest('[data-select-repo]'); if(target) selectRepository(target.getAttribute('data-select-repo')!);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){const target=(event.target as Element).closest('[data-select-repo]');if(target)selectRepository(target.getAttribute('data-select-repo')!);}}} ref={chartRef} aria-label={expanded ? 'Expanded chart' : undefined} className={`chart-surface ${expanded ? 'chart-expanded' : ''}`} role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined}>
          {params.get('view') === 'swarm' ? <><div className="swarm-toolbar">{chartControls}</div><Swarm markets={liveMarkets} params={params} hidden={hidden} predictions={predictions} t={t} playing={playing} togglePlay={() => playing ? setPlaying(false) : replay()} scrub={scrub} speed={replaySpeed} setSpeed={setReplaySpeed} loop={replayLoop} setLoop={setReplayLoop}/></> : <TimeFigure controls={chartControls} t={t} replay={() => playing ? setPlaying(false) : replay()} playing={playing} hidden={hidden} toggle={() => setHidden(!hidden)} q={params.get('q') ?? ''} iso={compare ? compareHover || selected.id : params.get('iso')} selectedId={selectedLive.id} expanded={expanded} scrub={scrub} speed={replaySpeed} setSpeed={setReplaySpeed} loop={replayLoop} setLoop={setReplayLoop}/>} 
          {expanded && <button className="expanded-close" aria-label="Close expanded chart" onClick={()=>setExpanded(false)}><Icon name="close"/></button>}
          {expanded && <aside className="expanded-details"><h2>{selectedLive.repo}</h2><Inspector market={selectedLive}/></aside>}
        </div>
        <div id="repositories" className="reveal-section repository-section">
          <SplitList onCompare={() => setSideways(true)} rows={liveMarkets} params={params} predictions={predictions} select={item => selectRepository(item.id)} trade={item => { setSelected(item); focusDesk(); }}/>
        </div>
        <MarketSections market={selectedLive} connected={connected} trade={trade} balance={balance} predictionCount={Object.keys(predictions).length} t={t} playing={playing} onFunds={() => setFunds(true)} onPredictions={focusDesk} onReplay={() => playing ? setPlaying(false) : replay()} onTrade={focusDesk}/>
      </div>
    </div>
    {bubble && <aside className="comparison-bubble" aria-label={`${bubble} comparison panel`}><header><h2>{bubble === 'repository-detail' ? selectedLive.repo : bubble[0].toUpperCase()+bubble.slice(1)}</h2><button aria-label="Close comparison panel" onClick={()=>setBubble('')}><Icon name="close"/></button></header>{bubble === 'repository-detail' ? <Inspector market={selectedLive}/> : bubble === 'funds' ? <><p>sUSDS available: {balance.toFixed(2)}</p><button disabled={!trade} onClick={()=>setFunds(true)}>Manage funds</button></> : <><p>{Object.keys(predictions).length} predictions loaded</p><button onClick={focusDesk}>Open prediction controls</button></>}</aside>}
    <aside className={`desk desk-open ${deskOverlay ? 'overlay-open' : ''} ${mobile === 'desk' ? 'mobile-sheet-open' : ''}`} aria-label="Trading desk">
      <div className="desk-head">
        <div><span>Trading desk</span><strong>{selectedLive.name}</strong></div>
        <button className="desk-close" aria-label="Close trading desk" onClick={() => {setMobile('chart'); setDeskOverlay(false);}}><Icon name="close"/></button>
      </div>
      <div key={selectedLive.id} data-pulse className="selected-trade-card">
        <span className="repo-mark" aria-hidden="true"><i/><i/><i/></span>
        <div><strong>{selectedLive.owner}/<b>{selectedLive.repo}</b></strong><span>UP <AnimatedValue value={selectedLive.up.toFixed(4)}/> · gap <AnimatedValue value={`${selectedLive.residual < 0 ? '−' : '+'}${Math.abs(selectedLive.residual).toFixed(4)}`}/></span></div>
        <button className="primary" onClick={focusDesk}>Trade</button>
      </div>
      <div className="desk-tabs segmented">
        {['desk', 'repository', 'funds'].map(value => <button key={value} aria-pressed={dock === value} aria-current={dock === value ? 'true' : undefined} title={dock === value ? 'Current' : undefined} onClick={() => setDock(value)}><Icon name={value === 'desk' ? 'desk' : value === 'repository' ? 'list' : 'wallet'} size={16}/>{value[0].toUpperCase() + value.slice(1)}</button>)}
      </div>
      <div className="desk-body">
        {dock === 'repository' ? <div className="desk-inspector"><Inspector market={selectedLive}/><button className="primary" onClick={focusDesk}>Trade {selectedLive.repo}</button></div> : dock === 'funds' ? <div className="funds-dock"><h2>Funds</h2><dl><div><dt>sUSDS</dt><dd>{balance.toFixed(2)}</dd></div><div><dt>Trade wallet</dt><dd>{trade ? 'Ready · mock' : 'Not created'}</dd></div></dl><button disabled={!trade} title={!trade ? 'Create trade wallet first' : 'Deposit, convert, withdraw or sell positions'} onClick={() => setFunds(true)}>Manage funds</button></div> : <Predictions connected={connected} connect={() => void connectWallet()} trade={trade} creating={creating} create={() => {
          setCreating(true);
          const provider = mockProvider();
          const request = provider?.__calls ? provider.request({ method: 'eth_sendTransaction', params: [{ from: '0x' + '11'.repeat(20), data: '0x' }] }) : Promise.resolve();
          void request.then(() => { setTimeout(() => { setTrade(true); setCreating(false); }, 900); }).catch(() => { setCreating(false); setWalletError('Trade wallet creation rejected'); });
        }} balance={balance} funds={() => setFunds(true)} predictions={predictions} load={value => { setPredictions(value); setProgress(-1); }} execute={() => setProgress(0)} progress={progress}/>} 
      </div>
    </aside>
    <button className="mobile-desk-trigger primary" aria-label="Desk" onClick={() => setMobile('desk')}><Icon name="desk"/>Trading desk<span>{Object.keys(predictions).length ? `${Object.keys(predictions).length} loaded` : `${connected ? 1 : 0}/3 setup`}</span></button>
  </div></div>;

  return <>
    <Search/>
    {sideways && <SidewaysComparison loading={loading} rows={liveMarkets} initial={selectedLive.id} close={() => setSideways(false)} select={id => { selectRepository(id); setSideways(false); }}/>}
    <Masthead onGuide={() => setGuide(true)} leaderboard={path === '/leaderboard'} connected={connected} setup={balance > 0 ? 3 : trade ? 2 : connected ? 1 : 0} setConnected={value => { if (value) void connectWallet(); else { setConnected(false); setTrade(false); } }} round={round} onRefresh={volumes => setMarkets(current => current.map(item => { const volume = volumes[item.id as keyof typeof volumes]; return volume ? { ...item, volTok: Number(volume.totalVolumeTokens), liqTok: Number(volume.totalLiquidityTokens) } : item; }))}/>
    <main className={`page main mobile-${mobile}`}>
      {path === '/leaderboard' ? <div className="leaderboard-route"><LeaderboardPodium/><Leaderboard params={params} connected={connected} error={fail} retry={retry}/></div> : path.startsWith('/repo/') ? market ? <Detail market={market}/> : <section className="card empty">No repositories match <a href="#/">All deep markets</a></section> : round !== 'round3' ? (contestById(round) ? <ContestMarket key={round} contest={contestById(round)!} params={params}/> : <ContestOverview archived={round === 'archived'}/>) : rootMarket}
    </main>
    {walletError && <div className="wallet-error" role="alert">{walletError}<button onClick={() => setWalletError('')}>Dismiss</button></div>}
    <nav className="mobile-tabs" aria-label="Deep views">{['chart','list','desk','board'].map(value => <button key={value} aria-label={value === 'desk' ? 'Desk' : undefined} aria-pressed={mobile === value} aria-current={mobile === value ? 'true' : undefined} title={mobile === value ? 'Current' : undefined} onClick={() => { setMobile(value); if (value === 'board') location.hash = '#/leaderboard'; else if (path !== '/') location.hash = '#/'; }}><Icon name={value as IconName} size={18}/>{value === 'desk' ? 'Trading desk' : value[0].toUpperCase() + value.slice(1)}</button>)}</nav>
    {connected && params.get('dialog') === 'profile' && <Profile profile={profile} save={setProfile} close={() => updateQuery({ dialog: null })}/>} 
    {guide && <Guide close={() => setGuide(false)} action={step => {
      setGuide(false); location.hash = '#/'; setDock((step === 2 || step === 3) && trade ? 'funds' : 'desk'); setMobile('desk');
      setTimeout(() => {
        if (step === 0) { if (!connectedRef.current) window.dispatchEvent(new CustomEvent('seer:connect')); else document.querySelector<HTMLButtonElement>('[data-testid=wallet-button]')?.click(); }
        else if (step === 2 || step === 3) { if (trade) setFunds(true); else document.querySelector<HTMLElement>('[data-testid=setup-step][data-step="2"] button')?.focus(); }
        else document.querySelector<HTMLElement>(step === 1 ? '[data-testid=setup-step][data-step="2"] button' : step === 4 ? '[data-testid=upload-predictions-button]' : '[data-testid=start-trading]')?.focus();
      }, 140);
    }}/>} 
    {funds && <Funds cash={cash} setCash={setCash} close={() => setFunds(false)} balance={balance} setBalance={setBalance} holdings={holdings} setHoldings={setHoldings}/>} 
  </>;
}
