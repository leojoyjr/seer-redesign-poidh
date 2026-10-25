export interface Question { pre: string; cond: string }
export interface Milestone {
  id: string; token: 'ETH' | 'GNO' | 'PNK' | 'AAVE'; chain: 'ETH' | 'Gnosis'; question: Question;
  orgSlug: string; proposal: string; seed: number; preset: 'neutral' | 'include' | 'exclude';
  status: 'Active' | 'Awaiting' | 'Resolved'; outcome?: 'YES' | 'NO'; impact: number;
}
export const activeMilestone = {
  orgSlug: 'ethereum', proposal: 'EIP-8363', seed: 8363, preset: 'neutral',
  id: 'eth-8363', token: 'ETH', chain: 'ETH',
  question: { pre: 'What will the impact on ETH price be ', cond: 'if EIP-8363 is Scheduled for Inclusion in Hegota?' },
  status: 'Active', impact: (2430.07 - 2430.03) / 2430.03,
  spot: 2432.83, yes: 2430.07, no: 2430.03, volume: 2610000, tvl: 231050,
  endTimestamp: Date.now() + ((6 * 24 + 15) * 60 + 58) * 60000,
  pair: 'WETH/USDS', band: 0.01, window: 5,
} satisfies Milestone & { spot: number; yes: number; no: number; volume: number; tvl: number; endTimestamp: number; pair: string; band: number; window: number };
function closed(token: 'GNO' | 'PNK', proposal: string, verb: string, impact: number, outcome?: 'YES' | 'NO'): Milestone {
  return { orgSlug: token === 'GNO' ? 'gnosis-dao' : 'kleros-dao', proposal, seed: Number(proposal.split('-')[1]), preset: 'neutral', id: proposal.toLowerCase(), token, chain: 'Gnosis',
    question: { pre: `What will the impact on ${token} price be `, cond: `if ${proposal} is ${verb}?` },
    status: outcome ? 'Resolved' : 'Awaiting', outcome, impact: impact / 100 };
}
export const closedMilestones: Milestone[] = [
  closed('GNO', 'GIP-152', 'passed', 0), closed('PNK', 'KIP-90', 'approved', 1.68, 'YES'),
  closed('GNO', 'GIP-151', 'passed', 1.24, 'YES'), closed('PNK', 'KIP-88', 'approved', 1.91, 'YES'),
  closed('PNK', 'KIP-86', 'approved', 1.94, 'YES'), closed('GNO', 'GIP-149', 'approved', -1.48, 'NO'),
  closed('GNO', 'GIP-145', 'approved', 1.96, 'YES'), closed('GNO', 'GIP-153', 'passed', 2.47, 'YES'),
];
export interface Organization { slug: string; name: string; active: number; proposals: number; chain: 'Gnosis' | 'ETH' | 'Ethereum'; liquidity: number | null; activeMarket: boolean }
const orgDefinitions: Organization[] = [
  { slug: 'gnosis-dao', name: 'Gnosis DAO', active: 0, proposals: 6, chain: 'Gnosis', liquidity: null, activeMarket: false },
  { slug: 'kleros-dao', name: 'Kleros DAO', active: 0, proposals: 4, chain: 'Gnosis', liquidity: null, activeMarket: false },
  { slug: 'ethereum', name: 'Ethereum', active: 1, proposals: 1, chain: 'Ethereum', liquidity: 231050, activeMarket: true },
  { slug: 'veloradao', name: 'VeloraDAO', active: 0, proposals: 0, chain: 'ETH', liquidity: null, activeMarket: false },
  { slug: 'aave-dao', name: 'Aave DAO', active: 0, proposals: 0, chain: 'ETH', liquidity: null, activeMarket: false },
];

export type ActiveMilestone = Omit<typeof activeMilestone, 'token' | 'chain' | 'preset'> & Pick<Milestone, 'token' | 'chain' | 'preset'>;
function active(token: Milestone['token'], proposal: string, orgSlug: string, spot: number, preset: Milestone['preset'], hours: number): ActiveMilestone {
  const impact = preset === 'include' ? .018 : preset === 'exclude' ? -.016 : .0004;
  return { ...activeMilestone, id: `${token.toLowerCase()}-${proposal.split('-')[1]}`, token, proposal, orgSlug,
    chain: token === 'AAVE' || token === 'ETH' ? 'ETH' : 'Gnosis', seed: Number(proposal.split('-')[1]), preset,
    question: { pre: `What will the impact on ${token} price be `, cond: `if ${proposal} is ${token === 'GNO' ? 'passed' : token === 'ETH' ? 'Scheduled for Inclusion in Hegota' : 'approved'}?` },
    spot, yes: spot * (1 + impact / 2), no: spot * (1 - impact / 2), impact,
    volume: spot * 12000, tvl: spot * 900, endTimestamp: Date.now() + hours * 3600000,
    pair: `${token === 'ETH' ? 'WETH' : token}/USDS` };
}
export const activeMilestones: ActiveMilestone[] = [activeMilestone,
  active('GNO', 'GIP-154', 'gnosis-dao', 128.42, 'include', 40),
  active('PNK', 'KIP-91', 'kleros-dao', .0234, 'exclude', 86),
  active('AAVE', 'AIP-412', 'aave-dao', 182.64, 'include', 21),
  active('ETH', 'EIP-7928', 'ethereum', 2432.83, 'neutral', 240)];
export function getActiveMilestones(search = window.location.search): ActiveMilestone[] {
  const raw = new URLSearchParams(search).get('n');
  if (!raw || !/^\d+$/.test(raw)) return activeMilestones;
  const n = Math.max(1, Math.min(12, Number(raw)));
  return Array.from({ length: n }, (_, i) => {
    const market = activeMilestones[i % activeMilestones.length];
    if (i < activeMilestones.length) return market;
    const number = market.seed + 100 + i;
    const proposal = `${market.proposal.split('-')[0]}-${number}`;
    return active(market.token, proposal, market.orgSlug, market.spot * (1 + (i + 1) * .007), (['neutral', 'include', 'exclude'] as const)[i % 3], 24 + i * 17);
  });
}
export const organizations: Organization[] = orgDefinitions.map(org => {
  const active = activeMilestones.filter(m => m.orgSlug === org.slug);
  return { ...org, active: active.length, proposals: active.length + closedMilestones.filter(m => m.orgSlug === org.slug).length,
    activeMarket: active.length > 0, liquidity: active.length ? active.reduce((sum, m) => sum + m.tvl, 0) : null };
});
export const verdictPresets = { neutral: .0004, include: .018, exclude: -.016 } as const;
export function findMilestone(id: string) { return [...getActiveMilestones(), ...closedMilestones].find(m => m.id === id); }
