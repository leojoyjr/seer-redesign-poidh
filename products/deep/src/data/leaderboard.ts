import all from './real/leaderboard-all.json';
import month from './real/leaderboard-1m.json';
import week from './real/leaderboard-1w.json';
import day from './real/leaderboard-1d.json';
import type { LeaderboardRow } from './types';
export type Period = 'all' | '1m' | '1w' | '1d';
export function leaderboard(period: Period) { const data = { all, '1m': month, '1w': week, '1d': day }[period]; return { total: data.total, rows: data.rows.map(row => ({ ...row, mergedWallets: 'mergedWallets' in row ? row.mergedWallets : [] })) as LeaderboardRow[] }; }
