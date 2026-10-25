export type Step = { t: number; value: number };
export type Market = { name: string; owner: string; repo: string; id: string; up: number; down: number; sum: number; residual: number; volTok: number; liqTok: number };
export type MarketSeries = { up: Step[]; down: Step[]; invalidCount: number };
export type LeaderboardRow = { rank: number; address: string; pnl: number; volume: number; roi: number | null; marketCount: number; mergedWallets: string[] };
