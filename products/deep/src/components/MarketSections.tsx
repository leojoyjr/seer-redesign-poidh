import { useEffect, useState } from 'react';
import type { Market } from '../data/types';
import { series } from '../data/series';
import { Inspector } from './Inspector';
import { Icon } from './Icon';

const sections = [
  ['repositories', 'Repositories'],
  ['repository-detail', 'Repository detail'],
  ['funds', 'Funds'],
  ['predictions', 'Predictions'],
  ['replay', 'Replay'],
] as const;

export function SectionNav({openCompare,openPanel}:{openCompare:()=>void;openPanel?:(id:string)=>void}) {
  const [active, setActive] = useState('repositories');
  useEffect(() => {
    const nodes = sections.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const column = document.querySelector<HTMLElement>('.workspace-scroll');
    const workspace = document.querySelector<HTMLElement>('.market-workspace');
    const root = window; void column; void workspace;
    const update = () => {
      const top = 160;
      const reached = nodes.filter(node => node.getBoundingClientRect().top <= top);
      setActive(reached.at(-1)?.id ?? 'repositories');
    };
    root?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      root?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return <div className="rail-slot"><nav data-testid="section-rail" className="section-nav" aria-label="Market sections">
    {sections.map(([id, label]) => <a key={id} aria-label={label} className={active === id ? 'active' : ''} aria-current={active === id ? 'location' : undefined} href={`#${id}`} onClick={event => {
      event.preventDefault();
      setActive(id);
      openPanel?.(id === 'repository-detail' ? id : '');
      const section = document.getElementById(id);
      section?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      section?.animate([{outline:'2px solid var(--violet)'},{outline:'2px solid var(--violet)',offset:.8},{outline:'2px solid transparent'}],{duration:1200});
      if (id === 'repository-detail') requestAnimationFrame(() => document.querySelector('.comparison-bubble')?.animate([{outline:'2px solid var(--violet)'},{outline:'2px solid transparent'}],{duration:1200}));
    }}><Icon name={id === 'funds' ? 'wallet' : id === 'predictions' ? 'upload' : id === 'replay' ? 'play' : id === 'repository-detail' ? 'split' : 'list'}/><span>{label}</span></a>)}
    <button aria-label="Sideways comparison" onClick={openCompare}><Icon name="compare"/><span>Sideways comparison</span></button>
  </nav></div>;
}

export function MarketSections({ market, connected, trade, balance, predictionCount, t, playing, onFunds, onPredictions, onReplay, onTrade }:{
  market: Market;
  connected: boolean;
  trade: boolean;
  balance: number;
  predictionCount: number;
  t: number;
  playing: boolean;
  onFunds: () => void;
  onPredictions: () => void;
  onReplay: () => void;
  onTrade: () => void;
}) {
  const [detailTab, setDetailTab] = useState<'signal'|'history'|'market'>('signal');
  const history = series[market.id].up;
  const first = history[0]?.value ?? market.up;
  return <div className="market-sections">
    <section id="repository-detail" className="workspace-section repository-detail-section reveal-section">
      <div className="section-heading">
        <div><h2>{market.name}</h2><p>The selected repository, its priced originality signal, and the evidence behind it.</p></div>
        <button className="secondary" onClick={onTrade}><Icon name="arrow" size={17}/>Trade this signal</button>
      </div>
      <div className="detail-tabs" role="tablist" aria-label="Repository detail">
        {(['signal','history','market'] as const).map(tab => <button key={tab} role="tab" aria-selected={detailTab === tab} onClick={() => setDetailTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
      </div>
      <div className="detail-stage" role="tabpanel">
        {detailTab === 'signal' ? <Inspector market={market}/> : detailTab === 'history' ? <div className="history-summary"><strong>{history.length - 1}</strong><span>recorded UP price changes between Oct 1 and Oct 18</span><dl><div><dt>Opening UP</dt><dd>{first.toFixed(4)}</dd></div><div><dt>Current UP</dt><dd>{market.up.toFixed(4)}</dd></div><div><dt>Range</dt><dd>{Math.min(...history.map(point => point.value)).toFixed(4)}–{Math.max(...history.map(point => point.value)).toFixed(4)}</dd></div></dl></div> : <div className="market-meaning"><h3>What is priced</h3><p>UP prices the share of work the market considers original. DOWN independently prices dependencies. Their residual is shown rather than normalized away.</p><h3>How to use the signal</h3><p>Compare the market with your own model, then trade the disagreement through a limited trade wallet.</p></div>}
      </div>
    </section>

    <section id="funds" className="workspace-section split-section reveal-section">
      <div><h2>Funds</h2><p>Funding stays explicitly local and mocked in this build. No live wallet balance or successful trade is implied.</p></div>
      <dl className="section-ledger"><div><dt>Wallet</dt><dd>{connected ? 'Connected' : 'Not connected'}</dd></div><div><dt>Trade wallet</dt><dd>{trade ? 'Created · mock' : 'Not created'}</dd></div><div><dt>sUSDS available</dt><dd>{balance.toFixed(2)}</dd></div></dl>
      <button className="secondary" disabled={!trade} title={!trade ? 'Create trade wallet first' : 'Deposit, convert, withdraw or sell positions'} onClick={onFunds}><Icon name="wallet" size={17}/>Manage funds</button>
    </section>

    <section id="predictions" className="workspace-section split-section reveal-section">
      <div><h2>Predictions</h2><p>Upload a repo,predicted CSV, inspect differences against market prices, and export current market weights.</p></div>
      <div className="prediction-callout"><strong>{predictionCount || 'No'}</strong><span>{predictionCount === 1 ? 'prediction loaded' : 'predictions loaded'}</span></div>
      <button className="secondary" onClick={onPredictions}><Icon name="upload" size={17}/>Open prediction controls</button>
    </section>

    <section id="replay" className="workspace-section split-section reveal-section">
      <div><h2>Replay</h2><p>Reconstruct the observed market state without inventing trades between recorded price updates.</p></div>
      <time dateTime={new Date(t * 1000).toISOString()}>{new Date(t * 1000).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'UTC' })} UTC</time>
      <button className="secondary" onClick={onReplay}><Icon name={playing ? 'pause' : 'play'} size={17}/>{playing ? 'Pause replay' : 'Replay market'}</button>
    </section>
  </div>;
}
