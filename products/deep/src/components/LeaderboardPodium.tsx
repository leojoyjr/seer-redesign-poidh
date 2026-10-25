import { leaderboard } from '../data/leaderboard';
import { accountName, Identicon } from './RankedTable';

const money = (value:number) => `${value < 0 ? '−' : '+'}$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits:2, minimumFractionDigits:2 })}`;

export function LeaderboardPodium() {
  const rows = leaderboard('all').rows.slice(0, 3);
  return <section className="leaderboard-podium" aria-label="Top three wallets">
    <div className="podium-title"><h2>Market leaders</h2><p>Realized profit and loss across all Deep markets.</p></div>
    {rows.map((row, index) => <a key={row.address} className={`podium-place place-${index + 1}`} href={`#/leaderboard?period=all&q=${row.address}`}>
      <span className="podium-rank">{index + 1}</span><Identicon address={row.address}/><span><strong>{accountName(row.address)}</strong><small>{row.marketCount} markets</small></span><b className={row.pnl < 0 ? 'loss' : 'gain'}>{money(row.pnl)}</b><span className="podium-metrics"><span>Volume ${row.volume.toLocaleString('en-US',{maximumFractionDigits:0})}</span><span>ROI {row.roi===null?'—':`${(row.roi*100).toFixed(0)}%`}</span></span>
    </a>)}
  </section>;
}
