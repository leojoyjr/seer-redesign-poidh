export const totals = { volume: 293.82, liquidity: 929.08 };
export async function refreshVolume() {
  const response = await fetch(new URL('./real/refresh-market-volume.json', import.meta.url), { cache: 'no-store' });
  if (!response.ok) throw new Error('Couldn’t refresh volume');
  const data: typeof import('./real/refresh-market-volume.json') = await response.json();
  return data.data.volumes;
}
