import source from './real/markets-data.json';
import volumes from './real/refresh-market-volume.json';
import type { Market } from './types';
const amounts: Record<string, { totalVolumeTokens: string; totalLiquidityTokens: string }> = volumes.data.volumes;
export const markets: Market[] = Object.entries(source.marketsData).map(([name, m]) => {
  const id = m.id.toLowerCase(); const [owner, repo] = name.split('/');
  return { name, owner, repo, id, up: m.upPrice, down: m.downPrice, sum: m.upPrice + m.downPrice, residual: 1 - m.upPrice - m.downPrice, volTok: Number(amounts[id]?.totalVolumeTokens ?? 0), liqTok: Number(amounts[id]?.totalLiquidityTokens ?? 0) };
}).sort((a, b) => b.up - a.up || a.name.localeCompare(b.name));
export const price = (value: number) => value.toFixed(4);
export const signed = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(4)}`;
