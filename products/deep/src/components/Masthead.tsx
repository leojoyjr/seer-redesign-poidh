import { AnimatedValue } from './AnimatedValue';
import { useEffect, useState } from 'react';
import { refreshVolume, totals } from '../data/totals';
import { contests, contestById, contestMedian } from '../data/contests';
import { leaderboard as getLeaderboard } from '../data/leaderboard';
import { updateQuery } from '../router';
import { Icon } from './Icon';
import { Menu } from './Menu';

export function Masthead({ connected, setup, setConnected, round, onRefresh, leaderboard, onGuide }:{ leaderboard:boolean; connected:boolean; setup:number; setConnected:(value:boolean)=>void; round:string; onRefresh:(volumes:Awaited<ReturnType<typeof refreshVolume>>)=>void; onGuide:()=>void }) {
  const [busy, setBusy] = useState(false), [hint, setHint] = useState('Refresh volume');
  const [tabs, setTabs] = useState<string[]>(['round3']);
  const contest = contestById(round);
  useEffect(() => { if (contest) setTabs(current => current.includes(round) ? current : [...current, round]); }, [round, contest]);
  const choose = (id:string) => { location.hash = `#/?round=${id}`; };
  const median = contest ? contestMedian(contest) : null;
  const home = !leaderboard && round === 'round3' && !location.hash.startsWith('#/repo/');
  async function refresh() {
    setBusy(true);
    try { onRefresh(await refreshVolume()); setHint('Volume refreshed from API snapshot'); }
    catch { setHint('Refresh failed, try again'); }
    finally { setBusy(false); }
  }
  return <>
    <header className="masthead page toolbar-row sb sb-row" data-align>
      <nav className="primary-nav sb-tabs" aria-label="Deep">
        <a data-testid="nav-markets" aria-disabled={home} title={home ? 'Already on Markets' : undefined} href="#/" className={`sb-tab${!leaderboard ? ' active is-active' : ''}`} aria-current={!leaderboard ? 'page' : undefined}>Markets</a>
        <div className="leader-nav"><a data-testid="nav-leaderboard" aria-disabled={leaderboard} title={leaderboard ? 'Already on Leaderboard' : undefined} className={`sb-tab${leaderboard ? ' active is-active' : ''}`} aria-current={leaderboard ? 'page' : undefined} href="#/leaderboard">Leaderboard <small>76</small></a><div className="leader-preview"><h3>Top wallets today</h3>{getLeaderboard('1d').rows.slice(0,3).map(row => <a tabIndex={-1} key={row.address} href={`#/leaderboard?period=1d&q=${row.address}`}>#{row.rank} {row.address.slice(0,6)}…{row.address.slice(-4)} <b className={row.pnl < 0 ? 'loss' : 'gain'}>${row.pnl.toFixed(2)}</b></a>)}</div></div>
        <button className="sb-tab" data-testid="nav-guide" onClick={onGuide}>Guide</button>
      </nav>
      {!leaderboard && <div className="contest-controls"><Menu testId="round-switcher" className="contest-switcher" label={<><Icon name="contests" size={18}/><span>Contest</span><i className="chev" aria-hidden="true"/></>}>{close => <><h3>Active</h3>{contests.filter(item => item.live).map(item => <button data-testid="round-option" role="menuitem" aria-checked={round === item.id} data-contest={item.id} key={item.id} onClick={() => { choose(item.id); close(); }}>{item.name}<span className="live">LIVE</span></button>)}<h3>Archived</h3>{contests.filter(item => !item.live).map(item => <button data-testid="round-option" role="menuitem" aria-checked={round === item.id} data-contest={item.id} key={item.id} onClick={() => { choose(item.id); close(); }}>{item.name}<span className="status">ENDED</span></button>)}<button role="menuitem" onClick={() => { choose('archived'); close(); }}>Archived contests · 7</button><button role="menuitem" onClick={() => { choose('all'); close(); }}>All contests · 8</button></>}</Menu><div className="open-contests" role="tablist" aria-label="Open contests">{tabs.map(id => { const item = contestById(id)!; return <div className="contest-tab" key={id}><button role="tab" aria-selected={round === id} aria-current={round === id ? 'page' : undefined} title={round === id ? 'Current' : undefined} onClick={() => choose(id)}>{item.name}{!item.live && <span className="status">ENDED</span>}</button>{!item.live && <button aria-label={`Close ${item.name}`} onClick={() => { setTabs(current => current.filter(value => value !== id)); if (round === id) choose('round3'); }}><Icon name="close" size={14}/></button>}</div>; })}</div></div>}
      <span className="spacer"/>
      {connected && <Menu testId="wallet-button" className="wallet" label="0x0000…dEaD">{close => <><button data-testid="nav-profile" role="menuitem" onClick={() => { updateQuery({ dialog:'profile' }); close(); }}><Icon name="profile" size={18}/>Profile</button><button role="menuitem" onClick={() => { setConnected(false); close(); }}><Icon name="logout" size={18}/>Disconnect</button></>}</Menu>}
      <span className="sr-only" data-testid="setup-counter">Setup {setup}/3</span>
    </header>
    {!leaderboard && <section className="contest-band sb sb-ctx">
      {home && <div className="asker-strip sb-meta" data-testid="asker-strip"><p className="sb-item"><b>Asked by</b><span>Optimism</span></p><p className="sb-item"><b>Priced</b><span>how original each repo is (UP price)</span></p><p className="sb-item"><b>Use</b><span>read the prices to rank repos (humans or agents via API)</span></p></div>}
      <div data-testid="stat-strip" className="stats-strip sb-kpis">{[[contest?.kind === 'YES / NO' ? 'Proposals' : 'Repositories', contest?.marketCount ?? ' - '],[`Median ${contest?.kind === 'YES / NO' ? 'YES' : contest?.kind === 'UP / DOWN' ? 'UP' : ''}`, median?.toFixed(4) ?? ' - '],['Volume', contest?.live ? `~$${totals.volume.toFixed(2)}` : ' - '],['Liquidity', contest?.live ? `~$${totals.liquidity.toFixed(2)}` : ' - '],['Last trade', contest?.live ? 'Oct 18 · 19:30 UTC' : ' - ']].map(([label,value], index) => <div className="stat sb-item" key={label}><span>{label}</span><strong data-testid={index === 2 ? 'totals-volume' : index === 3 ? 'totals-liquidity' : undefined}>{index < 4 ? <AnimatedValue value={String(value)}/> : value}{index === 2 && <button data-testid="refresh-volume" aria-label="Refresh volume" aria-busy={busy} disabled={busy || !contest?.live} title={contest?.live ? hint : 'Volume is not provided for this contest'} onClick={refresh}><Icon name="refresh" size={16}/></button>}</strong></div>)}</div>
    </section>}
  </>;
}
